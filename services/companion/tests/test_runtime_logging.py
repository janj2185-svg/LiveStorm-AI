from __future__ import annotations

import json
import logging
from pathlib import Path

import pytest

from sylora_companion.logging import JSONFormatter
from sylora_companion.runtime import AlreadyRunningError, SingleInstanceLock


def test_single_instance_lock_excludes_second_process_handle(tmp_path: Path) -> None:
    first = SingleInstanceLock(tmp_path)
    second = SingleInstanceLock(tmp_path)
    first.acquire()
    try:
        with pytest.raises(AlreadyRunningError):
            second.acquire()
    finally:
        first.release()
    second.acquire()
    second.release()


def test_json_logging_redacts_structured_and_inline_secrets() -> None:
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="request Authorization: Bearer should-not-leak token=also-hidden",
        args=(),
        exc_info=None,
    )
    record.fields = {"obs_password": "hidden-password", "safe": "visible"}
    formatted = JSONFormatter().format(record)
    payload = json.loads(formatted)
    assert "should-not-leak" not in formatted
    assert "also-hidden" not in formatted
    assert "hidden-password" not in formatted
    assert payload["fields"]["safe"] == "visible"
