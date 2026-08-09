"""LocalAvatarLifeController reaction ledger tests."""

from __future__ import annotations

import pytest

from app.live_platforms.common.cohost import DialogueDecision
from app.live_platforms.common.output import (
    LIORA_REACTIONS,
    LocalAvatarLifeController,
    CoHostOutputOrchestrator,
)


@pytest.mark.asyncio
async def test_local_avatar_normalizes_unknown_reaction() -> None:
    avatar = LocalAvatarLifeController()
    await avatar.react("spin_like_a_robot", sync_token="s1")
    assert avatar.reactions == ["idle"]
    assert avatar.events[0].persona_id == "liora"


@pytest.mark.asyncio
async def test_local_avatar_accepts_human_vocabulary() -> None:
    avatar = LocalAvatarLifeController()
    for reaction in sorted(LIORA_REACTIONS):
        await avatar.react(reaction)
    assert set(avatar.reactions) == LIORA_REACTIONS


@pytest.mark.asyncio
async def test_orchestrator_defaults_to_liora_controller() -> None:
    orch = CoHostOutputOrchestrator()
    decision = DialogueDecision(
        should_respond=True,
        target_user_id="u1",
        target_username="viewer",
        speak_voice=True,
        show_text=True,
        avatar_reaction="gift_react",
        defer_seconds=0,
        merge_with_previous=False,
        yield_to_host=False,
        interrupt_tts=False,
        priority=1,
        reason="gift_thanks",
        prompt_hints={"gift_name": "soft-ping", "emotion": "delighted"},
    )
    plan = await orch.apply(decision, reply_text="Дякую за Soft Ping!")
    assert plan.avatar_reaction == "gift_react"
    assert orch.avatar.reactions[-1] == "gift_react"
    assert orch.obs.events[-1][1]["persona_id"] == "liora"
