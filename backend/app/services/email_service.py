"""
Transactional Email Service for MedQurex Clinical Portal.
Delivers OTP security codes and account recovery notifications using Titan SMTP.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

from app.core.config import settings

logger = logging.getLogger("medqurex.email")


def send_password_reset_otp_email(to_email: str, recipient_name: str, otp_code: str, role: str = "user") -> bool:
    """
    Sends a high-security 6-digit OTP verification email for account password reset.
    """
    portal_name = "User Portal" if role == "user" else "Pharmacist Clinical Portal"
    accent_color = "#0d9488" if role == "user" else "#7c3aed"
    accent_dark = "#0f766e" if role == "user" else "#6d28d9"

    subject = f"MedQurex - {otp_code} is your password reset code"

    text_body = f"""Hello {recipient_name or 'Valued Member'},

We received a request to reset your password for your MedQurex {portal_name} account ({to_email}).

Your 6-Digit Password Reset Code is:
{otp_code}

This code will expire in 15 minutes.
If you did not make this request, please disregard this email. Your account remains safe.

Warm regards,
MedQurex Clinical Intelligence Security Team
https://www.medqurex.tech
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, {accent_color}, {accent_dark}); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">MedQurex</h1>
              <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 500;">
                Clinical Decision Support & Pharmacological Portal
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #0f172a;">
                Password Reset Verification
              </h2>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>{recipient_name or 'Valued Member'}</strong>,<br/>
                We received a request to reset the password associated with your MedQurex <strong>{portal_name}</strong> account (<code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0f172a;">{to_email}</code>).
              </p>

              <div style="background-color: #f8fafc; border: 1px dashed {accent_color}; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">
                  Your One-Time Security Code
                </p>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: {accent_color}; font-family: monospace;">
                  {otp_code}
                </div>
                <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8;">
                  ⏱ Valid for 15 minutes only
                </p>
              </div>

              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #64748b;">
                Enter this code on the password reset screen to verify your identity and set a new password.
              </p>

              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
                  <strong>Didn't request this?</strong> If you did not ask to reset your password, please ignore this email or review your account credentials immediately.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; 2026 MedQurex Clinical Intelligence. All rights reserved.<br/>
                This is an automated security transmission sent to {to_email}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    return _send_mime_message(to_email, subject, text_body, html_body)


def send_email_recovery_notification(to_email: str, recipient_name: str, phone: str, role: str = "user") -> bool:
    """
    Sends an informative notification when a registered email is retrieved via verified phone number.
    """
    portal_name = "User Portal" if role == "user" else "Pharmacist Clinical Portal"
    subject = "MedQurex - Account Email Recovery Notice"

    text_body = f"""Hello {recipient_name or 'Valued Member'},

We received a request to recover your MedQurex account email using your registered contact number ending in {phone[-4:] if len(phone) >= 4 else phone}.

Your registered email address is: {to_email}
Portal: {portal_name}

You can log in at https://www.medqurex.tech

If you did not initiate this request, please contact system administration.

Regards,
MedQurex Clinical Intelligence
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: sans-serif; color: #1e293b;">
  <div style="max-width: 500px; margin: auto; background: #fff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Account Email Recovery</h2>
    <p style="font-size: 14px; color: #475569;">
      Hello <strong>{recipient_name or 'Valued Member'}</strong>,
    </p>
    <p style="font-size: 14px; color: #475569;">
      An account email recovery was requested for your registered contact number.
    </p>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 15px; font-weight: bold; color: #0d9488; text-align: center;">
      {to_email}
    </div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
      MedQurex Clinical Decision Support Platform
    </p>
  </div>
</body>
</html>
"""
    return _send_mime_message(to_email, subject, text_body, html_body)


def _send_via_resend_http(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """
    Dispatches email over HTTPS (Port 443) using Resend REST API.
    Bypasses cloud platform SMTP blocks (e.g. Render Free Tier) completely.
    """
    import json
    import urllib.request

    api_key = (settings.RESEND_API_KEY or "").strip()
    if not api_key:
        return False

    # Primary sender from settings or system@medqurex.tech
    primary_sender = (settings.RESEND_FROM or "").strip()
    if not primary_sender:
        primary_sender = f"MedQurex Support <{settings.SMTP_FROM or 'system@medqurex.tech'}>"

    def _execute_resend_request(from_address: str) -> bool:
        payload = {
            "from": from_address,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content
        }
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MedQurex-Clinical/2.2"
            }
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            logger.info(f"Resend HTTPS dispatch succeeded: {resp_data}")
            print(f"[RESEND_SUCCESS] Dispatched email to {to_email} via Resend (from={from_address}, id={resp_data.get('id')})")
            return True

    try:
        logger.info(f"Attempting dispatch to {to_email} via Resend from {primary_sender}...")
        return _execute_resend_request(primary_sender)
    except urllib.error.HTTPError as http_err:
        # If medqurex.tech domain is not yet verified in Resend dashboard, fallback to onboarding@resend.dev
        if http_err.code == 403 and "onboarding@resend.dev" not in primary_sender:
            logger.warning(f"Domain not yet verified in Resend (HTTP 403). Falling back to onboarding@resend.dev...")
            print(f"[RESEND_FALLBACK] Domain not yet verified in Resend. Falling back to onboarding@resend.dev so OTP is delivered...")
            try:
                return _execute_resend_request("MedQurex Support <onboarding@resend.dev>")
            except Exception as fallback_exc:
                logger.error(f"Fallback Resend dispatch failed: {fallback_exc}")
        logger.warning(f"Resend HTTPS dispatch failed: {http_err}")
        return False
    except Exception as exc:
        logger.warning(f"Resend HTTPS dispatch failed: {exc}", exc_info=True)
        print(f"[RESEND_WARNING] Resend dispatch failed: {exc}. Falling back to Titan SMTP...")
        return False



def _send_mime_message(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """
    Sends an email via Resend HTTPS API (if configured) or Titan SMTP with STARTTLS.
    """
    import time

    # 1. Primary Cloud Delivery: If RESEND_API_KEY is present, send over HTTPS Port 443 (never blocked on Render)
    if (settings.RESEND_API_KEY or "").strip():
        sent_via_http = _send_via_resend_http(to_email, subject, text_content, html_content)
        if sent_via_http:
            return True

    # 2. Secondary / Local Delivery: Titan SMTP on Port 587
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"MedQurex Support <{settings.SMTP_FROM}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    port = settings.SMTP_PORT or 587
    user = (settings.SMTP_USER or "").strip()
    password = (settings.SMTP_PASS or "").strip()

    max_retries = 3
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[Attempt {attempt}/{max_retries}] Connecting to SMTP {settings.SMTP_HOST}:{port}...")
            server = smtplib.SMTP(settings.SMTP_HOST, port, timeout=25)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Successfully dispatched email to {to_email}")
            print(f"[EMAIL_SUCCESS] Dispatched email to {to_email} via SMTP (Attempt {attempt})")
            return True
        except Exception as exc:
            last_error = exc
            logger.warning(f"[Attempt {attempt}] Email dispatch warning to {to_email}: {exc}")
            print(f"[EMAIL_RETRY] Attempt {attempt} failed: {exc}")
            if attempt < max_retries:
                time.sleep(1.5)

    print(f"[EMAIL_ERROR] Failed to send email to {to_email} after {max_retries} attempts: {last_error}")
    return False




