"""Register all ORM models for Alembic."""

from platform_api.domains.admin.models import AuditLog  # noqa: F401
from platform_api.domains.content.models import Comment, Post, Reaction  # noqa: F401
from platform_api.domains.identity.models import (  # noqa: F401
    EmailVerificationToken,
    PasswordResetToken,
    Session,
    User,
    UserCredential,
)
from platform_api.domains.media.models import MediaAsset, VideoJob  # noqa: F401
from platform_api.domains.notifications.models import Notification  # noqa: F401
from platform_api.domains.profile.models import Profile  # noqa: F401
from platform_api.domains.social_graph.models import Block, Follow  # noqa: F401
