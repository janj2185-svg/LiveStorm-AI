"""Register all ORM models for Alembic autogenerate."""

from platform_api.domains.identity.models import (  # noqa: F401
    EmailVerificationToken,
    Session,
    User,
    UserCredential,
)
from platform_api.domains.profile.models import Profile  # noqa: F401
