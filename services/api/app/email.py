from __future__ import annotations

import html
from datetime import timedelta
from email.message import EmailMessage
from urllib.parse import quote

import aiosmtplib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.errors import APIError
from app.models import EmailOutbox
from app.security import utcnow


def require_email_capability(settings: Settings) -> None:
    if not settings.smtp_configured:
        raise APIError(
            503,
            "email_delivery_unavailable",
            "Email delivery unavailable",
            "Email delivery is not configured for this deployment.",
        )


def verification_message(recipient: str, token: str, settings: Settings) -> EmailOutbox:
    link = f"{settings.web_base_url.rstrip('/')}/verify-email?token={quote(token)}"
    safe_link = html.escape(link, quote=True)
    text = (
        "Verify your SYLORA email address.\n\n"
        f"Open this link: {link}\n\n"
        f"Verification token: {token}\n"
        f"This token expires in {settings.verification_token_hours} hours."
    )
    html_body = (
        "<h1>Verify your SYLORA email</h1>"
        f'<p><a href="{safe_link}">Verify email address</a></p>'
        f"<p>This link expires in {settings.verification_token_hours} hours.</p>"
    )
    return EmailOutbox(
        message_type="email_verification",
        recipient=recipient,
        subject="Verify your SYLORA email",
        text_body=text,
        html_body=html_body,
    )


def password_reset_message(recipient: str, token: str, settings: Settings) -> EmailOutbox:
    link = f"{settings.web_base_url.rstrip('/')}/reset-password?token={quote(token)}"
    safe_link = html.escape(link, quote=True)
    text = (
        "A password reset was requested for your SYLORA account.\n\n"
        f"Open this link: {link}\n\n"
        f"Password reset token: {token}\n"
        f"This token expires in {settings.password_reset_minutes} minutes. "
        "If you did not request this, ignore this email."
    )
    html_body = (
        "<h1>Reset your SYLORA password</h1>"
        f'<p><a href="{safe_link}">Reset password</a></p>'
        f"<p>This link expires in {settings.password_reset_minutes} minutes.</p>"
        "<p>If you did not request this, ignore this email.</p>"
    )
    return EmailOutbox(
        message_type="password_reset",
        recipient=recipient,
        subject="Reset your SYLORA password",
        text_body=text,
        html_body=html_body,
    )


class SMTPAdapter:
    def __init__(self, settings: Settings) -> None:
        require_email_capability(settings)
        self.settings = settings

    async def send(self, outbox: EmailOutbox) -> None:
        message = EmailMessage()
        message["From"] = f"{self.settings.smtp_from_name} <{self.settings.smtp_from_email}>"
        message["To"] = outbox.recipient
        message["Subject"] = outbox.subject
        message.set_content(outbox.text_body)
        message.add_alternative(outbox.html_body, subtype="html")
        await aiosmtplib.send(
            message,
            hostname=self.settings.smtp_host,
            port=self.settings.smtp_port,
            username=self.settings.smtp_username,
            password=(
                self.settings.smtp_password.get_secret_value()
                if self.settings.smtp_password
                else None
            ),
            use_tls=self.settings.smtp_use_tls,
            start_tls=self.settings.smtp_start_tls,
            timeout=self.settings.smtp_timeout_seconds,
        )


async def drain_outbox(
    session_factory: async_sessionmaker[AsyncSession],
    settings: Settings,
    *,
    limit: int = 50,
) -> tuple[int, int]:
    adapter = SMTPAdapter(settings)
    sent = 0
    failed = 0
    for _ in range(limit):
        async with session_factory() as session, session.begin():
            message = await session.scalar(
                select(EmailOutbox)
                .where(
                    EmailOutbox.sent_at.is_(None),
                    EmailOutbox.next_attempt_at <= utcnow(),
                )
                .order_by(EmailOutbox.created_at)
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            if message is None:
                break
            try:
                await adapter.send(message)
            except Exception as exc:
                message.attempts += 1
                message.last_error_code = type(exc).__name__[:96]
                delay = min(3600, 2 ** min(message.attempts, 11))
                message.next_attempt_at = utcnow() + timedelta(seconds=delay)
                failed += 1
            else:
                message.attempts += 1
                message.sent_at = utcnow()
                message.last_error_code = None
                sent += 1
    return sent, failed


async def celery_drain_outbox(
    session_factory: async_sessionmaker[AsyncSession], settings: Settings
) -> dict[str, int]:
    sent, failed = await drain_outbox(session_factory, settings)
    return {"sent": sent, "failed": failed}
