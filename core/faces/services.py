import os
import cv2
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.models import VectorParams, Distance, PointStruct
from django.conf import settings
from django.tasks import task

# CRITICAL: Set this BEFORE importing or initializing InsightFace
os.environ['INSIGHTFACE_HOME'] = '/tmp/insightface'

# Initialize Qdrant lazily
_qdrant_client = None

def get_qdrant_client():
    global _qdrant_client
    if _qdrant_client is None:
        QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
        QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
        _qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        
        # Ensure collection exists
        try:
            _qdrant_client.get_collection(collection_name="faces")
        except Exception:
            _qdrant_client.create_collection(
                collection_name="faces",
                vectors_config=VectorParams(size=512, distance=Distance.COSINE),
            )
    return _qdrant_client

# Initialize InsightFace lazily
_app = None

def get_insightface_app():
    global _app
    if _app is None:
        try:
            from insightface.app import FaceAnalysis
            _app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
            _app.prepare(ctx_id=0, det_size=(640, 640))
        except ImportError:
            _app = False
    return _app

def extract_embedding(image_path: str):
    """Extract a single normalized 512D face embedding from an image file."""
    app = get_insightface_app()
    if not app:
        raise RuntimeError("InsightFace is not loaded.")
    
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Invalid image file.")
    
    faces = app.get(img)
    if not faces:
        raise ValueError("No face detected in the image.")
    
    # Use the best face
    best_face = max(faces, key=lambda f: f.det_score)
    
    embedding = best_face.embedding
    norm = np.linalg.norm(embedding)
    if norm != 0:
        embedding = embedding / norm
        
    return embedding.tolist()


def average_embeddings(embeddings: list) -> list:
    """
    Average multiple 512D face embeddings into one and normalize.
    This produces a more robust representation for recognition.
    """
    if not embeddings:
        raise ValueError("No embeddings to average.")
    
    arr = np.array(embeddings)
    avg = np.mean(arr, axis=0)
    norm = np.linalg.norm(avg)
    if norm != 0:
        avg = avg / norm
    return avg.tolist()


def upsert_face_to_qdrant(qdrant_id: str, embedding: list, metadata: dict):
    client = get_qdrant_client()
    client.upsert(
        collection_name="faces",
        points=[
            PointStruct(
                id=qdrant_id,
                vector=embedding,
                payload=metadata
            )
        ]
    )

def delete_face_from_qdrant(qdrant_id: str):
    client = get_qdrant_client()
    client.delete(
        collection_name="faces",
        points_selector=[qdrant_id]
    )


@task
def process_face_identity_task(identity_id):
    from .models import FaceIdentity
    try:
        identity = FaceIdentity.objects.get(id=identity_id)
    except FaceIdentity.DoesNotExist:
        return

    embeddings = []
    errors = []

    for i, face_img in enumerate(identity.images.all()):
        try:
            emb = extract_embedding(face_img.image.path)
            embeddings.append(emb)
        except ValueError as e:
            errors.append(f"Image {i+1}: {str(e)}")

    if len(embeddings) < 4:
        print(f"[face worker] ❌ Deleted identity {identity_id}: Not enough valid faces. Issues: {errors}")
        identity.delete()
        return

    try:
        avg_embedding = average_embeddings(embeddings)
        identity.embedding = avg_embedding
        identity.save()

        metadata = {
            "name": identity.name,
            "is_global": False,
            "user_id": str(identity.user.id) if identity.user else None
        }
        upsert_face_to_qdrant(str(identity.qdrant_id), avg_embedding, metadata)
        print(f"[face worker] ✅ Processed & upserted identity {identity_id}")
    except Exception as e:
        print(f"[face worker] ❌ Unexpected Error: {str(e)}")
        identity.delete()
