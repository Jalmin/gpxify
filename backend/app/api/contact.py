"""
Contact form API endpoint
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

router = APIRouter()


class ContactRequest(BaseModel):
    """Contact form request model"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=2000)


@router.post("/send")
async def send_contact_email(request: ContactRequest):
    """
    Send contact form email

    Args:
        request: Contact form data

    Returns:
        Success message
    """
    try:
        # Get SMTP configuration from environment
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        recipient_email = os.getenv('CONTACT_EMAIL', 'loic@carapacebleue.com')

        if not smtp_user or not smtp_password:
            # In development, just log the message
            print(f"\n=== Contact Form Submission ===")
            print(f"From: {request.name} <{request.email}>")
            print(f"Message: {request.message}")
            print(f"===============================\n")
            return {
                "success": True,
                "message": "Message reçu (mode dev)"
            }

        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"[GPX Ninja] Message de {request.name}"
        msg['From'] = smtp_user
        msg['To'] = recipient_email
        msg['Reply-To'] = request.email

        # Email body
        text_content = f"""
Nouveau message depuis GPX Ninja

De: {request.name}
Email: {request.email}

Message:
{request.message}

---
Envoyé depuis gpx.ninja
"""

        html_content = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Nouveau message depuis GPX Ninja</h2>

    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>De:</strong> {request.name}</p>
        <p><strong>Email:</strong> <a href="mailto:{request.email}">{request.email}</a></p>
    </div>

    <h3 style="color: #555;">Message:</h3>
    <div style="background-color: #fff; padding: 15px; border-left: 3px solid #007bff; margin: 10px 0;">
        <p style="white-space: pre-wrap;">{request.message}</p>
    </div>

    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
    <p style="color: #888; font-size: 12px;">Envoyé depuis <a href="https://gpx.ninja">gpx.ninja</a></p>
</body>
</html>
"""

        # Attach both plain text and HTML versions
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        return {
            "success": True,
            "message": "Message envoyé avec succès !"
        }

    except smtplib.SMTPException as e:
        print(f"SMTP Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de l'envoi du message. Réessayez plus tard."
        )
    except Exception as e:
        print(f"Error sending contact email: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de l'envoi du message"
        )
