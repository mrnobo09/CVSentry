from django.contrib import admin
from .models import User
# Register your models here.
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'fullname', 'role', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'fullname')
    ordering = ('id',)