import smtplib
from email.message import EmailMessage

import structlog

from platform_api.config import get_settings

logger = structlog.get_logger()


class EmailNotConfiguredError(RuntimeError):
    pass


async def send_email(*, to: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    settings = get_settings()

    if settings.app_env == "development" and not settings.smtp_configured:
        logger.info(
            "email.console_dev",
            to=to,
            subject=subject,
            body=body_text,
        )
        return

    if not settings.smtp_configured:
        raise EmailNotConfiguredError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_FROM and related env vars."
        )

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body_text)
    if body_html:
        message.add_alternative(body_html, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)

    logger.info("email.sent", to=to, subject=subject)
