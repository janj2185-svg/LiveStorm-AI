---
name: AI language defaultLanguage field
description: How the AI language fallback system works — defaultLanguage column, auto-detect, announcements.
---

## The Problem
Auto language detection was falling back to English when comment was too short or ambiguous.
Announcements (level_up, gift, achievement) had no language param — always English.

## The Fix
Added `defaultLanguage` text column to `ai_persona_configs` (default "uk").

**generateCommentReply** in aiService.ts:
- Accepts `defaultLanguage` as 6th param (after conversationContext)
- When `language === "auto"`: builds explicit instruction naming the fallback language
- Instruction: "If detection is uncertain or comment too short, use [defaultLanguage]. NEVER default to English unless comment is clearly in English."
- Logs: `[AI:lang:select]` in socketServer (shows comment, replyLang, defaultLang) and `[AI:lang]` in aiService

**generateAnnouncement** in aiService.ts:
- Accepts optional `language` field in event object
- Injects `LANG_INSTRUCTIONS[language]` into system prompt

**aiAnnouncer.ts**: all emitAi* functions now pass `config.defaultLanguage ?? "uk"` as language.

**Routes**: PUT /ai/config accepts `defaultLanguage`, validates it's in VALID_LANGUAGES and not "auto".

**Frontend**: Reply Language section shows sub-selector "When uncertain, reply in:" (purple) only when replyLanguage === "auto". defaultLanguage defaults to "uk" in UI display.

## How to Apply
If streamer reports wrong language responses: check `[AI:lang:select]` logs. The `defaultLang` shown there is what the AI falls back to. Streamer can change it in AI Assistant → Reply Language → "When uncertain, reply in:" sub-selector.
