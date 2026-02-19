import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

def generate_otp(length=6):
    """Generate a numeric OTP of given length."""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email, otp):
    """Send OTP via email."""
    subject = 'Your Login Verification Code'
    message = f'Your verification code is: {otp}\n\nThis code expires in 5 minutes.'
    email_from = settings.EMAIL_HOST_USER
    recipient_list = [email]
    
    send_mail(subject, message, email_from, recipient_list)
