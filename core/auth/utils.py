import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.tasks import task

@task
def send_otp_email_task(email, otp):
    """Send OTP via email in the background using Django 6.0 Tasks."""
    subject = 'Your Login Verification Code'
    message = f'Your verification code is: {otp}\n\nThis code expires in 5 minutes.'
    email_from = settings.EMAIL_HOST_USER
    recipient_list = [email]
    
    send_mail(
        subject=subject,
        message=message,
        from_email=email_from,
        recipient_list=recipient_list,
    )

def generate_otp(length=6):
    """Generate a numeric OTP of given length."""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email, otp):
    """Send OTP via email."""
    send_otp_email_task.enqueue(email=email, otp=otp)
