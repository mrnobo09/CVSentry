from djoser import email
from django.conf import settings
from django.tasks import task

@task
def send_activation_email_task(user_id, to):
    from .models import User
    try:
        user = User.objects.get(id=user_id)
        email_obj = CustomActivationEmail(None, {'user': user})
        super(CustomActivationEmail, email_obj).send(to)
    except User.DoesNotExist:
        pass

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

    def send(self, to, *args, **kwargs):
        user = getattr(self, 'context', {}).get('user')
        if user and getattr(user, 'id', None):
            send_activation_email_task.enqueue(user_id=user.id, to=to)
        else:
            super().send(to, *args, **kwargs)
