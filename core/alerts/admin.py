from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display  = ("id", "alert_type", "camera_id", "node_ip", "timestamp")
    list_filter   = ("alert_type",)
    search_fields = ("camera_id", "node_ip", "identities")
    ordering      = ("-timestamp",)
