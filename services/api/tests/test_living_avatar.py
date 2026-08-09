import asyncio

import pytest

from app.live_platforms.common.living_avatar import LivingAvatarController
from app.live_platforms.common.output import CoHostOutputOrchestrator
from app.live_platforms.common.cohost import DialogueDecision


@pytest.mark.asyncio
async def test_living_avatar_records_and_fans_out_reactions() -> None:
    avatar = LivingAvatarController(persona_name="Sylora")
    queue = avatar.subscribe()
    await avatar.react("talk", sync_token="sync-9", utterance="Привіт!")
    assert avatar.reactions == ["talk"]
    assert avatar.state.reaction == "talk"
    assert avatar.state.utterance == "Привіт!"
    assert avatar.state.mood == "warm"
    event = await asyncio.wait_for(queue.get(), timeout=1)
    assert event["type"] == "avatar.reaction"
    assert event["state"]["sync_token"] == "sync-9"
    avatar.unsubscribe(queue)


@pytest.mark.asyncio
async def test_orchestrator_passes_utterance_to_living_avatar() -> None:
    avatar = LivingAvatarController()
    orch = CoHostOutputOrchestrator(avatar=avatar)
    decision = DialogueDecision(
        should_respond=True,
        target_user_id="u1",
        target_username="viewer",
        speak_voice=True,
        show_text=True,
        avatar_reaction="talk",
        defer_seconds=0.0,
        merge_with_previous=False,
        yield_to_host=False,
        interrupt_tts=False,
        priority=2,
        reason="chat_reply",
    )
    plan = await orch.apply(decision, reply_text="Hey there")
    assert plan.avatar_reaction == "talk"
    assert avatar.state.utterance == "Hey there"
    assert avatar.reactions[-1] == "talk"


@pytest.mark.asyncio
async def test_unknown_reaction_falls_back_to_idle() -> None:
    avatar = LivingAvatarController()
    await avatar.react("do_a_backflip")
    assert avatar.state.reaction == "idle"
