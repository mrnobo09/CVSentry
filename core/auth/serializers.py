from djoser.serializers import UserSerializer, UserCreateSerializer
from rest_framework import serializers
from .models import User

class UserCreateSerializer(UserCreateSerializer):
    class Meta(UserCreateSerializer.Meta):
        model = User
        fields = ("id", "username", "fullname", "password", "role")
        extra_kwargs = {"password": {"write_only": True}}

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'fullname', 'role', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login']
        read_only_fields = ['id', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login']