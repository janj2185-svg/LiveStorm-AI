from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
import uuid
from datetime import timedelta
from types import SimpleNamespace
from typing import Any

import pytest
from sqlalchemy import func, select

from app.business_models import (
    BusinessAuditEvent,
    BusinessDocument,
    BusinessDocumentVersion,
    Expense,
    FinanceTransactionReference,
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
)
from app.models import (
    AccessSession,
    EmailOutbox,
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from app.security import utcnow
from app.storage import PresignedUpload, VerifiedObject
from tests.conftest import APIHarness, bearer, login, register_and_verify


async def member(
    api: APIHarness, email: str, *, role: str | None = None
) -> tuple[Any, dict[str, str]]:
    await register_and_verify(api, email=email, display_name=email.split("@")[0])
    user = await api.user(email)
    if role:
        async with api.app.state.session_factory() as db:
            selected = await db.scalar(select(Role).where(Role.name == role))
            assert selected is not None
            db.add(UserRole(user_id=user.id, role_id=selected.id))
            await db.commit()
    tokens = await login(api, email=email)
    return user, bearer(tokens["access_token"])


async def workspace(
    api: APIHarness, headers: dict[str, str], slug: str = "acme-company"
) -> dict[str, Any]:
    response = await api.client.post(
        "/v1/business/workspaces",
        headers=headers,
        json={"slug": slug, "name": "Acme Company", "type": "company"},
    )
    assert response.status_code == 201, response.text
    return response.json()


class BusinessStorage:
    def __init__(self) -> None:
        self.settings = SimpleNamespace(s3_presign_seconds=300)

    async def presign_put(
        self, *, object_key: str, content_type: str, sha256_hex: str
    ) -> PresignedUpload:
        return PresignedUpload(
            url=f"https://storage.test/{object_key}",
            headers={"Content-Type": content_type, "x-test-sha256": sha256_hex},
            expires_in_seconds=300,
        )

    async def verify_object(
        self,
        *,
        object_key: str,
        expected_content_type: str,
        expected_byte_size: int,
        expected_sha256: str,
    ) -> VerifiedObject:
        return VerifiedObject(
            content_type=expected_content_type,
            byte_size=expected_byte_size,
            sha256=expected_sha256,
        )

    async def presign_get(self, *, object_key: str) -> str:
        return f"https://storage.test/{object_key}?signed=true"


async def test_workspace_invitation_isolation_role_and_last_owner(api: APIHarness) -> None:
    owner, owner_headers = await member(api, "owner@example.com", role="business")
    invitee, invitee_headers = await member(api, "invitee@example.com")
    _, outsider_headers = await member(api, "outsider@example.com")
    created = await workspace(api, owner_headers)
    workspace_id = created["id"]

    contact = await api.client.post(
        "/v1/business/crm/contacts",
        params={"workspace_id": workspace_id},
        headers=owner_headers,
        json={"first_name": "Tenant", "last_name": "Only"},
    )
    assert contact.status_code == 201, contact.text
    hidden = await api.client.get(
        f"/v1/business/crm/contacts/{contact.json()['id']}",
        params={"workspace_id": workspace_id},
        headers=outsider_headers,
    )
    assert hidden.status_code == 404

    invitation = await api.client.post(
        f"/v1/business/workspaces/{workspace_id}/invitations",
        headers=owner_headers,
        json={"email": invitee.email, "role": "member"},
    )
    assert invitation.status_code == 202, invitation.text
    async with api.app.state.session_factory() as db:
        message = await db.scalar(
            select(EmailOutbox)
            .where(
                EmailOutbox.message_type == "workspace_invitation",
                EmailOutbox.recipient == invitee.email,
            )
            .order_by(EmailOutbox.created_at.desc())
        )
        assert message is not None
        match = re.search(r"Invitation token: ([A-Za-z0-9_-]+)", message.text_body)
        assert match
        raw_token = match.group(1)

    accepted = await api.client.post(
        "/v1/business/invitations/accept",
        headers=invitee_headers,
        json={"token": raw_token},
    )
    assert accepted.status_code == 200, accepted.text
    replay = await api.client.post(
        "/v1/business/invitations/accept",
        headers=invitee_headers,
        json={"token": raw_token},
    )
    assert replay.status_code == 400

    role_change = await api.client.patch(
        f"/v1/business/workspaces/{workspace_id}/members/{invitee.id}",
        headers=owner_headers,
        json={"role": "viewer"},
    )
    assert role_change.status_code == 200, role_change.text
    denied = await api.client.post(
        "/v1/business/tasks",
        params={"workspace_id": workspace_id},
        headers=invitee_headers,
        json={"title": "Viewer cannot create this"},
    )
    assert denied.status_code == 403
    last_owner = await api.client.delete(
        f"/v1/business/workspaces/{workspace_id}/members/{owner.id}",
        headers=owner_headers,
    )
    assert last_owner.status_code == 409
    assert last_owner.json()["code"] == "last_workspace_owner"


async def test_crm_task_and_calendar_state_rules(api: APIHarness) -> None:
    owner, headers = await member(api, "operator@example.com", role="business")
    created = await workspace(api, headers, "operations-team")
    workspace_id = created["id"]
    stages = await api.client.get(
        "/v1/business/crm/pipeline-stages",
        params={"workspace_id": workspace_id},
        headers=headers,
    )
    assert stages.status_code == 200
    stage_rows = stages.json()
    deal = await api.client.post(
        "/v1/business/crm/deals",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={
            "name": "Production contract",
            "stage_id": stage_rows[0]["id"],
            "value_minor": 250_000,
            "currency": "USD",
        },
    )
    assert deal.status_code == 201, deal.text
    transitioned = await api.client.post(
        f"/v1/business/crm/deals/{deal.json()['id']}/transition",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={"stage_id": stage_rows[1]["id"], "note": "Qualified by sales"},
    )
    assert transitioned.status_code == 200
    detail = await api.client.get(
        f"/v1/business/crm/deals/{deal.json()['id']}",
        params={"workspace_id": workspace_id},
        headers=headers,
    )
    assert [item["activity_type"] for item in detail.json()["activities"]] == [
        "created",
        "stage_transition",
    ]

    blocker = await api.client.post(
        "/v1/business/tasks",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={"title": "Blocker"},
    )
    dependent = await api.client.post(
        "/v1/business/tasks",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={"title": "Dependent"},
    )
    assert blocker.status_code == dependent.status_code == 201
    dependency = await api.client.put(
        f"/v1/business/tasks/{dependent.json()['id']}/dependencies/{blocker.json()['id']}",
        params={"workspace_id": workspace_id},
        headers=headers,
    )
    assert dependency.status_code == 200
    cycle = await api.client.put(
        f"/v1/business/tasks/{blocker.json()['id']}/dependencies/{dependent.json()['id']}",
        params={"workspace_id": workspace_id},
        headers=headers,
    )
    assert cycle.status_code == 409
    incomplete = await api.client.post(
        f"/v1/business/tasks/{dependent.json()['id']}/complete",
        params={"workspace_id": workspace_id, "version": 1},
        headers=headers,
    )
    assert incomplete.status_code == 409
    for task in (blocker, dependent):
        completed = await api.client.post(
            f"/v1/business/tasks/{task.json()['id']}/complete",
            params={"workspace_id": workspace_id, "version": 1},
            headers=headers,
        )
        assert completed.status_code == 200, completed.text
    stale = await api.client.patch(
        f"/v1/business/tasks/{dependent.json()['id']}",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={"version": 1, "title": "Stale write"},
    )
    assert stale.status_code == 409

    first = await api.client.post(
        "/v1/business/calendar/events",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={
            "title": "Planning",
            "starts_at": "2026-08-01T10:00:00Z",
            "ends_at": "2026-08-01T11:00:00Z",
            "timezone": "UTC",
            "attendees": [str(owner.id)],
        },
    )
    second = await api.client.post(
        "/v1/business/calendar/events",
        params={"workspace_id": workspace_id},
        headers=headers,
        json={
            "title": "Overlap",
            "starts_at": "2026-08-01T10:30:00Z",
            "ends_at": "2026-08-01T11:30:00Z",
            "timezone": "UTC",
            "attendees": [str(owner.id)],
        },
    )
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] in second.json()["conflict_ids"]
    ranged = await api.client.get(
        "/v1/business/calendar/events",
        params={
            "workspace_id": workspace_id,
            "start": "2026-08-01T09:00:00Z",
            "end": "2026-08-01T12:00:00Z",
        },
        headers=headers,
    )
    assert ranged.status_code == 200
    assert {item["id"] for item in ranged.json()} == {
        first.json()["id"],
        second.json()["id"],
    }
    outside_range = await api.client.get(
        "/v1/business/calendar/events",
        params={
            "workspace_id": workspace_id,
            "start": "2026-08-01T12:00:00Z",
            "end": "2026-08-01T13:00:00Z",
        },
        headers=headers,
    )
    assert outside_range.status_code == 200
    assert outside_range.json() == []


async def test_documents_finance_and_provider_boundaries(api_factory: Any) -> None:
    async with api_factory() as unavailable:
        _, headers = await member(unavailable, "docs-unavailable@example.com", role="business")
        created = await workspace(unavailable, headers, "docs-unavailable")
        document = await unavailable.client.post(
            "/v1/business/documents",
            params={"workspace_id": created["id"]},
            headers=headers,
            json={"title": "No fake upload"},
        )
        failed = await unavailable.client.post(
            f"/v1/business/documents/{document.json()['id']}/versions",
            params={"workspace_id": created["id"]},
            headers=headers,
            json={
                "content_type": "application/pdf",
                "byte_size": 10,
                "sha256": "a" * 64,
                "rights_declaration": "Owned by this workspace.",
            },
        )
        assert failed.status_code == 503
        async with unavailable.app.state.session_factory() as db:
            assert await db.scalar(select(func.count()).select_from(BusinessDocumentVersion)) == 0

    async with api_factory(object_storage=BusinessStorage()) as api:
        owner, headers = await member(api, "finance@example.com", role="business")
        created = await workspace(api, headers, "finance-team")
        workspace_id = created["id"]
        document = await api.client.post(
            "/v1/business/documents",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={"title": "Approved contract", "classification": "confidential"},
        )
        version = await api.client.post(
            f"/v1/business/documents/{document.json()['id']}/versions",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={
                "content_type": "application/pdf",
                "byte_size": 10,
                "sha256": "b" * 64,
                "rights_declaration": "Owned by this workspace.",
            },
        )
        assert version.status_code == 201, version.text
        verified = await api.client.post(
            f"/v1/business/documents/{document.json()['id']}/versions/"
            f"{version.json()['version_id']}/verify",
            params={"workspace_id": workspace_id},
            headers=headers,
        )
        assert verified.status_code == 200, verified.text
        approval = await api.client.post(
            f"/v1/business/documents/{document.json()['id']}/approvals",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={"approver_user_id": str(owner.id)},
        )
        decision = await api.client.post(
            f"/v1/business/documents/{document.json()['id']}/approvals/"
            f"{approval.json()['id']}/decision",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={"decision": "approved"},
        )
        assert approval.status_code == 201 and decision.status_code == 200
        published = await api.client.patch(
            f"/v1/business/documents/{document.json()['id']}",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={"state": "published"},
        )
        assert published.status_code == 200

        expense = await api.client.post(
            "/v1/business/finance/expenses",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={
                "vendor": "Hosting Inc",
                "amount_minor": 12_500,
                "currency": "USD",
                "incurred_at": "2026-08-01T00:00:00Z",
            },
        )
        submitted = await api.client.post(
            f"/v1/business/finance/expenses/{expense.json()['id']}/submit",
            params={"workspace_id": workspace_id},
            headers=headers,
        )
        approved = await api.client.post(
            f"/v1/business/finance/expenses/{expense.json()['id']}/decision",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={"decision": "approved", "reason": "Valid operating expense"},
        )
        assert submitted.json()["status"] == "submitted"
        assert approved.json()["status"] == "approved"

        invoice = await api.client.post(
            "/v1/business/finance/invoices",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={
                "number": "INV-2026-001",
                "currency": "USD",
                "tax_minor": 500,
                "lines": [
                    {
                        "description": "Consulting",
                        "quantity": 2,
                        "unit_amount_minor": 10_000,
                    }
                ],
            },
        )
        sent = await api.client.post(
            f"/v1/business/finance/invoices/{invoice.json()['id']}/send",
            params={"workspace_id": workspace_id},
            headers=headers,
        )
        assert sent.json()["status"] == "sent"
        mismatch = await api.client.post(
            f"/v1/business/finance/invoices/{invoice.json()['id']}/reconcile",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={
                "bank_reference": "BANK-123",
                "evidence": "Bank statement line dated 2026-08-02.",
                "amount_minor": 20_000,
                "currency": "USD",
                "reconciled_at": "2026-08-02T00:00:00Z",
            },
        )
        assert mismatch.status_code == 422
        reconciled = await api.client.post(
            f"/v1/business/finance/invoices/{invoice.json()['id']}/reconcile",
            params={"workspace_id": workspace_id},
            headers=headers,
            json={
                "bank_reference": "BANK-123",
                "evidence": "Bank statement line dated 2026-08-02.",
                "amount_minor": 20_500,
                "currency": "USD",
                "reconciled_at": "2026-08-02T00:00:00Z",
            },
        )
        assert reconciled.status_code == 200, reconciled.text
        assert reconciled.json()["status"] == "paid"
        report = await api.client.get(
            "/v1/business/reports/finance",
            params={"workspace_id": workspace_id},
            headers=headers,
        )
        assert report.status_code == 200, report.text
        assert report.json()["basis"] == "persisted_business_records"
        assert report.json()["expenses"] == [
            {"status": "approved", "currency": "USD", "amount_minor": 12_500}
        ]
        assert report.json()["invoices"] == [
            {"status": "paid", "currency": "USD", "amount_minor": 20_500}
        ]
        async with api.app.state.session_factory() as db:
            assert (
                await db.scalar(select(func.count()).select_from(FinanceTransactionReference)) == 1
            )
            assert (
                await db.scalar(
                    select(func.count())
                    .select_from(BusinessAuditEvent)
                    .where(BusinessAuditEvent.action == "invoice.manually_reconciled")
                )
                == 1
            )
            immutable = await db.get(
                BusinessDocumentVersion, uuid.UUID(version.json()["version_id"])
            )
            assert immutable is not None
            immutable.sha256 = "c" * 64
            with pytest.raises(ValueError, match="immutable"):
                await db.commit()
            await db.rollback()


async def test_admin_flags_users_analytics_audit_and_health(api_factory: Any) -> None:
    secret = "service-health-secret-with-at-least-thirty-two-characters"
    async with api_factory(service_health_hmac_secret=secret) as api:
        admin, admin_headers = await member(api, "admin@example.com", role="admin")
        target, target_headers = await member(api, "target@example.com")
        await login(api, email=target.email, device_label="Second target session")

        flag = await api.client.post(
            "/v1/admin/feature-flags",
            headers=admin_headers,
            json={
                "key": "business.calendar-v2",
                "environments": ["test"],
                "enabled": True,
                "rollout_bps": 5000,
            },
        )
        assert flag.status_code == 201, flag.text
        evaluations = [
            await api.client.post(
                "/v1/admin/feature-flags/business.calendar-v2/evaluate",
                headers=admin_headers,
                json={"subject": "stable-subject", "environment": "test"},
            )
            for _ in range(2)
        ]
        assert evaluations[0].json() == evaluations[1].json()
        conflict = await api.client.patch(
            "/v1/admin/feature-flags/business.calendar-v2",
            headers=admin_headers,
            json={"expected_version": 99, "rollout_bps": 10_000},
        )
        assert conflict.status_code == 409

        setting = await api.client.put(
            "/v1/admin/settings/payments.api-key",
            headers=admin_headers,
            json={"value": {"credential": "write-only-value"}, "secret": True},
        )
        assert setting.status_code == 200
        assert setting.json()["value"] is None
        listed = await api.client.get("/v1/admin/settings", headers=admin_headers)
        assert listed.json()[0]["value"] is None
        assert listed.json()[0]["configured"] is True

        suspended = await api.client.post(
            f"/v1/admin/users/{target.id}/suspend",
            headers=admin_headers,
            json={"reason": "Confirmed account security incident"},
        )
        assert suspended.status_code == 200, suspended.text
        invalidated = await api.client.get("/v1/auth/me", headers=target_headers)
        assert invalidated.status_code == 401
        self_guard = await api.client.post(
            f"/v1/admin/users/{admin.id}/suspend",
            headers=admin_headers,
            json={"reason": "This must be rejected"},
        )
        assert self_guard.status_code == 409
        async with api.app.state.session_factory() as db:
            sessions = list(
                (
                    await db.scalars(
                        select(AccessSession).where(AccessSession.user_id == target.id)
                    )
                ).all()
            )
            assert sessions and all(item.revoked_at is not None for item in sessions)

        analytics = await api.client.get("/v1/admin/analytics", headers=admin_headers)
        assert analytics.status_code == 200
        assert analytics.json()["users"]["active"] == 1
        assert analytics.json()["basis"] == "persisted_platform_records"
        audit = await api.client.get("/v1/admin/audit", params={"limit": 1}, headers=admin_headers)
        assert audit.status_code == 200
        assert len(audit.json()["items"]) == 1
        assert audit.json()["next_cursor"]

        observed = {
            "service": "worker",
            "instance": "worker-1",
            "status": "healthy",
            "checks": {"database": "reachable"},
            "observed_at": "2026-07-31T15:00:00Z",
        }
        raw = json.dumps(observed, separators=(",", ":")).encode()
        timestamp = str(int(time.time()))
        signature = hmac.new(
            secret.encode(), timestamp.encode() + b"." + raw, hashlib.sha256
        ).hexdigest()
        ingested = await api.client.post(
            "/v1/admin/service-health",
            content=raw,
            headers={
                "Content-Type": "application/json",
                "X-Service-Timestamp": timestamp,
                "X-Service-Signature": signature,
            },
        )
        assert ingested.status_code == 202, ingested.text
        health = await api.client.get("/v1/admin/service-health", headers=admin_headers)
        assert health.status_code == 200
        assert health.json()["reports"][0]["status"] == "healthy"
        assert health.json()["prometheus_replacement"] is False

        # A non-admin operator with only admin:users cannot suspend the sole active admin.
        operator, operator_headers = await member(api, "operator-admin@example.com")
        async with api.app.state.session_factory() as db:
            permission = await db.scalar(select(Permission).where(Permission.name == "admin:users"))
            assert permission is not None
            role = Role(
                name="user-operator",
                description="User administration operator",
                is_system=False,
            )
            db.add(role)
            await db.flush()
            db.add(RolePermission(role_id=role.id, permission_id=permission.id))
            db.add(UserRole(user_id=operator.id, role_id=role.id))
            await db.commit()
        operator_tokens = await login(api, email=operator.email)
        operator_headers = bearer(operator_tokens["access_token"])
        last_admin = await api.client.post(
            f"/v1/admin/users/{admin.id}/suspend",
            headers=operator_headers,
            json={"reason": "Must preserve one active platform admin"},
        )
        assert last_admin.status_code == 409
        assert last_admin.json()["code"] == "last_active_admin"
        restored = await api.client.post(
            f"/v1/admin/users/{target.id}/restore",
            headers=admin_headers,
            json={"reason": "Security incident remediation completed"},
        )
        assert restored.status_code == 200, restored.text
        assert restored.json()["status"] == "active"


async def test_invitation_expiry_and_business_account_deletion(api: APIHarness) -> None:
    owner, owner_headers = await member(api, "deleting-owner@example.com", role="business")
    expiring_user, expiring_headers = await member(api, "expired-invite@example.com")
    co_owner, co_owner_headers = await member(api, "successor-owner@example.com")
    created = await workspace(api, owner_headers, "ownership-transfer")
    workspace_id = created["id"]

    expiring_invitation = await api.client.post(
        f"/v1/business/workspaces/{workspace_id}/invitations",
        headers=owner_headers,
        json={"email": expiring_user.email, "role": "member"},
    )
    assert expiring_invitation.status_code == 202, expiring_invitation.text
    async with api.app.state.session_factory() as db:
        invitation = await db.scalar(
            select(WorkspaceInvitation).where(
                WorkspaceInvitation.workspace_id == uuid.UUID(workspace_id),
                WorkspaceInvitation.email == expiring_user.email,
            )
        )
        message = await db.scalar(
            select(EmailOutbox)
            .where(
                EmailOutbox.message_type == "workspace_invitation",
                EmailOutbox.recipient == expiring_user.email,
            )
            .order_by(EmailOutbox.created_at.desc())
        )
        assert invitation is not None and message is not None
        invitation.expires_at = utcnow() - timedelta(seconds=1)
        await db.commit()
        token_match = re.search(r"Invitation token: ([A-Za-z0-9_-]+)", message.text_body)
        assert token_match

    expired = await api.client.post(
        "/v1/business/invitations/accept",
        headers=expiring_headers,
        json={"token": token_match.group(1)},
    )
    assert expired.status_code == 400
    assert expired.json()["code"] == "invalid_or_expired_invitation"

    blocked_deletion = await api.client.request(
        "DELETE",
        "/v1/users/me",
        headers=owner_headers,
        json={"password": "CorrectHorse!2026"},
    )
    assert blocked_deletion.status_code == 409
    assert blocked_deletion.json()["code"] == "workspace_ownership_transfer_required"

    successor_invitation = await api.client.post(
        f"/v1/business/workspaces/{workspace_id}/invitations",
        headers=owner_headers,
        json={"email": co_owner.email, "role": "admin"},
    )
    assert successor_invitation.status_code == 202, successor_invitation.text
    async with api.app.state.session_factory() as db:
        message = await db.scalar(
            select(EmailOutbox)
            .where(
                EmailOutbox.message_type == "workspace_invitation",
                EmailOutbox.recipient == co_owner.email,
            )
            .order_by(EmailOutbox.created_at.desc())
        )
        assert message is not None
        token_match = re.search(r"Invitation token: ([A-Za-z0-9_-]+)", message.text_body)
        assert token_match
    accepted = await api.client.post(
        "/v1/business/invitations/accept",
        headers=co_owner_headers,
        json={"token": token_match.group(1)},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["role"] == "admin"
    promoted = await api.client.patch(
        f"/v1/business/workspaces/{workspace_id}/members/{co_owner.id}",
        headers=owner_headers,
        json={"role": "owner"},
    )
    assert promoted.status_code == 200, promoted.text
    assert promoted.json()["role"] == "owner"

    draft = await api.client.post(
        "/v1/business/documents",
        params={"workspace_id": workspace_id},
        headers=owner_headers,
        json={"title": "Unversioned private draft", "classification": "restricted"},
    )
    expense = await api.client.post(
        "/v1/business/finance/expenses",
        params={"workspace_id": workspace_id},
        headers=owner_headers,
        json={
            "vendor": "Preserved Vendor",
            "amount_minor": 4200,
            "currency": "USD",
            "incurred_at": "2026-07-31T00:00:00Z",
        },
    )
    assert draft.status_code == expense.status_code == 201

    deleted = await api.client.request(
        "DELETE",
        "/v1/users/me",
        headers=owner_headers,
        json={"password": "CorrectHorse!2026"},
    )
    assert deleted.status_code == 200, deleted.text
    assert deleted.json() == {"status": "deleted"}

    async with api.app.state.session_factory() as db:
        persisted_workspace = await db.get(Workspace, uuid.UUID(workspace_id))
        assert persisted_workspace is not None
        assert persisted_workspace.owner_user_id == co_owner.id
        assert (
            await db.scalar(
                select(func.count())
                .select_from(WorkspaceMembership)
                .where(WorkspaceMembership.user_id == owner.id)
            )
            == 0
        )
        assert await db.get(BusinessDocument, uuid.UUID(draft.json()["id"])) is None
        assert await db.get(Expense, uuid.UUID(expense.json()["id"])) is not None
        assert (
            await db.scalar(
                select(func.count())
                .select_from(BusinessAuditEvent)
                .where(BusinessAuditEvent.workspace_id == uuid.UUID(workspace_id))
            )
            > 0
        )
