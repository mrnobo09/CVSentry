from djoser import email
from django.conf import settings

class CustomActivationEmail(email.ActivationEmail):
    template_name = 'email/activation.html'

    def get_context_data(self):
        context = super().get_context_data()
        frontend_url = settings.CORS_ALLOWED_ORIGINS[0] 
        domain = frontend_url.replace('http://', '').replace('https://', '')
        protocol = 'https' if 'https://' in frontend_url else 'http'
        context['frontend_url'] = frontend_url
        context['domain'] = domain
        context['protocol'] = protocol
        context['site_name'] = 'CVSentry'
        context['url'] = f"{frontend_url}/activate/{context.get('uid')}/{context.get('token')}"
        return context
