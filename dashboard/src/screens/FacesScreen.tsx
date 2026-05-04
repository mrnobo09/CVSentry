import { useState, useEffect, useRef } from 'react';
import { UserCircle, Upload, Trash2, Search, Plus, X, Loader2, ImagePlus, Images } from 'lucide-react';
import request from '../utils/request';

interface FaceImageData {
    id: string;
    image: string;
    created_at: string;
}

interface FaceIdentity {
    id: string;
    name: string;
    qdrant_id: string;
    images: FaceImageData[];
    image_count: number;
    is_active: boolean;
    updated_at: string;
    is_global: boolean;
}

const MIN_IMAGES = 4;
const MAX_IMAGES = 5;

export default function FacesScreen() {
    const [faces, setFaces] = useState<FaceIdentity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showUpload, setShowUpload] = useState(false);

    // Upload state
    const [uploadName, setUploadName] = useState('');
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;

    const fetchFaces = async () => {
        setIsLoading(true);
        try {
            const data: FaceIdentity[] = await request.get('/api/v1/faces/');
            setFaces(data || []);
        } catch {
            setFaces([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchFaces(); }, []);

    const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const combined = [...uploadFiles, ...newFiles].slice(0, MAX_IMAGES);

        setUploadFiles(combined);
        setUploadPreviews(combined.map(f => URL.createObjectURL(f)));
        setUploadError('');

        // Reset input so the same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        const newFiles = uploadFiles.filter((_, i) => i !== index);
        // Revoke old URL
        URL.revokeObjectURL(uploadPreviews[index]);
        setUploadFiles(newFiles);
        setUploadPreviews(newFiles.map(f => URL.createObjectURL(f)));
    };

    const handleUpload = async () => {
        if (!uploadName.trim()) {
            setUploadError('Please enter a name.');
            return;
        }
        if (uploadFiles.length < MIN_IMAGES) {
            setUploadError(`Please upload at least ${MIN_IMAGES} images. You have ${uploadFiles.length}.`);
            return;
        }
        if (uploadFiles.length > MAX_IMAGES) {
            setUploadError(`Maximum ${MAX_IMAGES} images allowed.`);
            return;
        }

        setIsUploading(true);
        setUploadError('');

        const formData = new FormData();
        formData.append('name', uploadName.trim());
        uploadFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            await request.post('/api/v1/faces/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            cancelUpload();
            fetchFaces();
        } catch (err: any) {
            const detail = err?.response?.data?.detail 
                || err?.response?.data?.images?.join(', ')
                || 'Upload failed. Ensure each image contains a clear face.';
            setUploadError(detail);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this identity? It will be removed from all edge nodes on next sync.')) return;
        try {
            await request.delete(`/api/v1/faces/${id}/`);
            fetchFaces();
        } catch {
            // silently fail
        }
    };

    const cancelUpload = () => {
        setShowUpload(false);
        setUploadName('');
        uploadPreviews.forEach(url => URL.revokeObjectURL(url));
        setUploadFiles([]);
        setUploadPreviews([]);
        setUploadError('');
    };

    const filtered = faces.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 pb-12 px-6">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <UserCircle className="w-8 h-8 text-indigo-400" />
                            Face Identities
                        </h1>
                        <p className="text-gray-400 mt-1 text-sm">
                            Manage known faces. Upload 4-5 photos per person for accurate recognition.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Identity
                    </button>
                </div>

                {/* Search */}
                <div className="relative max-w-xs mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Upload Modal */}
                {showUpload && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Images className="w-5 h-5 text-indigo-400" />
                                    New Identity
                                </h2>
                                <button onClick={cancelUpload} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Name Input */}
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Name</label>
                            <input
                                type="text"
                                placeholder="e.g. John Doe"
                                value={uploadName}
                                onChange={e => setUploadName(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
                            />

                            {/* Image Upload Area */}
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Face Photos ({uploadFiles.length}/{MAX_IMAGES})
                                </label>
                                <span className="text-xs text-gray-500">
                                    {uploadFiles.length < MIN_IMAGES
                                        ? `${MIN_IMAGES - uploadFiles.length} more needed`
                                        : '✓ Ready'
                                    }
                                </span>
                            </div>

                            {/* Image Grid */}
                            <div className="grid grid-cols-5 gap-2 mb-4">
                                {uploadPreviews.map((preview, i) => (
                                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700">
                                        <img src={preview} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(i)}
                                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[10px] text-gray-300 py-0.5">
                                            {i + 1}
                                        </div>
                                    </div>
                                ))}

                                {/* Add more button */}
                                {uploadFiles.length < MAX_IMAGES && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square rounded-lg border-2 border-dashed border-gray-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-1 transition-colors"
                                    >
                                        <ImagePlus className="w-5 h-5 text-gray-600" />
                                        <span className="text-[10px] text-gray-600">Add</span>
                                    </button>
                                )}
                            </div>

                            {/* Progress indicator */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: MAX_IMAGES }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-colors ${
                                            i < uploadFiles.length
                                                ? i < MIN_IMAGES ? 'bg-indigo-500' : 'bg-emerald-500'
                                                : i < MIN_IMAGES ? 'bg-gray-700' : 'bg-gray-800'
                                        }`}
                                    />
                                ))}
                            </div>

                            <p className="text-xs text-gray-500 mb-4">
                                Upload {MIN_IMAGES}-{MAX_IMAGES} clear photos of the same person from different angles for best accuracy.
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                multiple
                                onChange={handleFilesSelect}
                                className="hidden"
                            />

                            {/* Error */}
                            {uploadError && (
                                <div className="text-xs text-red-400 bg-red-900/30 border border-red-700/30 rounded-lg px-3 py-2 mb-4">
                                    {uploadError}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelUpload}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading || uploadFiles.length < MIN_IMAGES}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing {uploadFiles.length} photos…
                                        </>
                                    ) : (
                                        `Upload ${uploadFiles.length} Photos`
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Face Grid */}
                {isLoading ? (
                    <div className="text-center py-24 text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3" />
                        Loading identities…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 border border-gray-800 rounded-2xl bg-gray-900/40 text-gray-500">
                        <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold">No identities yet</p>
                        <p className="text-sm mt-1">Upload 4-5 face photos per person to start recognizing them on your cameras.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(face => (
                            <div
                                key={face.id}
                                className="group bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-500/40 transition-all"
                            >
                                {/* Image mosaic — show up to 4 images in a grid, or first image as hero */}
                                <div className="h-48 bg-gray-800 overflow-hidden">
                                    {face.images && face.images.length > 0 ? (
                                        face.images.length === 1 ? (
                                            <img
                                                src={`${BASE_URL}${face.images[0].image}`}
                                                alt={face.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                                                {face.images.slice(0, 4).map((img, i) => (
                                                    <img
                                                        key={img.id}
                                                        src={`${BASE_URL}${img.image}`}
                                                        alt={`${face.name} ${i+1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <UserCircle className="w-20 h-20 text-gray-700" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{face.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {face.image_count} photo{face.image_count !== 1 ? 's' : ''} · Added {new Date(face.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(face.id)}
                                        title="Delete identity"
                                        className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
