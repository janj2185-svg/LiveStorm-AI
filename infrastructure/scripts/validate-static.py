#!/usr/bin/env python3
"""Static validation for SYLORA infrastructure source files."""

from __future__ import annotations

import json
import pathlib
import sys

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required: python -m pip install PyYAML") from exc


ROOT = pathlib.Path(__file__).resolve().parents[2]
INFRASTRUCTURE = ROOT / "infrastructure"
WORKFLOWS = ROOT / ".github" / "workflows"


def validate_yaml(path: pathlib.Path) -> int:
    with path.open(encoding="utf-8") as handle:
        documents = list(yaml.safe_load_all(handle))
    if not documents or all(document is None for document in documents):
        raise ValueError("contains no YAML document")
    return sum(document is not None for document in documents)


def validate_json(path: pathlib.Path) -> None:
    with path.open(encoding="utf-8") as handle:
        json.load(handle)


def main() -> int:
    yaml_paths = sorted(INFRASTRUCTURE.rglob("*.yml"))
    yaml_paths += sorted(INFRASTRUCTURE.rglob("*.yaml"))
    if WORKFLOWS.exists():
        yaml_paths += sorted(WORKFLOWS.glob("*.yml"))
        yaml_paths += sorted(WORKFLOWS.glob("*.yaml"))
    json_paths = sorted(INFRASTRUCTURE.rglob("*.json"))

    errors: list[str] = []
    document_count = 0
    for path in yaml_paths:
        try:
            document_count += validate_yaml(path)
        except (OSError, yaml.YAMLError, ValueError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")

    for path in json_paths:
        try:
            validate_json(path)
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")

    forbidden_markers = ("TO" + "DO", "FIX" + "ME")
    for path in sorted(INFRASTRUCTURE.rglob("*")):
        if not path.is_file() or path.suffix in {".png", ".jpg", ".gif", ".webp"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for marker in forbidden_markers:
            if marker in text:
                errors.append(f"{path.relative_to(ROOT)}: contains forbidden marker {marker}")

    required = (
        INFRASTRUCTURE / "compose" / "compose.yml",
        INFRASTRUCTURE / "docker" / "api.Dockerfile",
        INFRASTRUCTURE / "kubernetes" / "base" / "kustomization.yaml",
        INFRASTRUCTURE / "kubernetes" / "overlays" / "development" / "kustomization.yaml",
        INFRASTRUCTURE / "kubernetes" / "overlays" / "production" / "kustomization.yaml",
        INFRASTRUCTURE / "observability" / "prometheus.yml",
        INFRASTRUCTURE / "observability" / "alerts.yml",
        WORKFLOWS / "ci.yml",
        WORKFLOWS / "deploy.yml",
    )
    for path in required:
        if not path.is_file():
            errors.append(f"{path.relative_to(ROOT)}: required file is missing")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(
        f"Validated {len(yaml_paths)} YAML files ({document_count} documents) "
        f"and {len(json_paths)} JSON files."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
