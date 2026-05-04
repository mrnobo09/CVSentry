import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from django.contrib.auth import get_user_model
from djoser.utils import encode_uid
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()
user = User.objects.create_user(email="test12345@cvsentry.com", fullname="Test User", password="password123", is_active=False)

uid = encode_uid(user.pk)
token = default_token_generator.make_token(user)
print(f"UID: {uid}, TOKEN: {token}")
