from djoser import email
from django.conf import settings

class CustomActivationEmail(email.ActivationEmail):
    template_name = 'email/activation.html'

    def get_context_data(self):
        context = super().get_context_data()
        context['frontend_url'] = settings.CORS_ALLOWED_ORIGINS[0] 
        return context
