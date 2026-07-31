#!/usr/bin/env python3
"""Static validation for SYLORA infrastructure source files."""

from __future__ import annotations

import json
import pathlib
import re
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


def load_yaml(path: pathlib.Path) -> object:
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def require(condition: bool, path: pathlib.Path, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(f"{path.relative_to(ROOT)}: {message}")


def validate_streaming_semantics(errors: list[str]) -> None:
    compose_path = INFRASTRUCTURE / "compose" / "compose.yml"
    mediamtx_path = INFRASTRUCTURE / "streaming" / "mediamtx.yml"
    coturn_path = INFRASTRUCTURE / "streaming" / "turnserver.conf"
    uploader_path = INFRASTRUCTURE / "streaming" / "upload-recordings.sh"
    prometheus_path = INFRASTRUCTURE / "observability" / "prometheus.yml"
    alerts_path = INFRASTRUCTURE / "observability" / "alerts.yml"
    dashboard_path = (
        INFRASTRUCTURE
        / "observability"
        / "grafana"
        / "dashboards"
        / "sylora-streaming.json"
    )
    kustomization_path = (
        INFRASTRUCTURE / "kubernetes" / "base" / "kustomization.yaml"
    )
    services_path = (
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-services.yaml"
    )
    statefulset_path = (
        INFRASTRUCTURE / "kubernetes" / "base" / "mediamtx-statefulset.yaml"
    )
    hpa_path = INFRASTRUCTURE / "kubernetes" / "base" / "streaming-hpa.yaml"
    streaming_config_path = (
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-configmap.yaml"
    )
    coturn_deployment_path = (
        INFRASTRUCTURE / "kubernetes" / "base" / "coturn-deployment.yaml"
    )
    env_example_path = INFRASTRUCTURE / ".env.example"

    semantic_paths = (
        compose_path,
        mediamtx_path,
        coturn_path,
        uploader_path,
        prometheus_path,
        alerts_path,
        dashboard_path,
        kustomization_path,
        services_path,
        statefulset_path,
        hpa_path,
        streaming_config_path,
        coturn_deployment_path,
        env_example_path,
    )
    if any(not path.is_file() for path in semantic_paths):
        return

    try:
        compose = load_yaml(compose_path)
        mediamtx = load_yaml(mediamtx_path)
        prometheus = load_yaml(prometheus_path)
        kustomization = load_yaml(kustomization_path)
        statefulset = load_yaml(statefulset_path)
        hpa = load_yaml(hpa_path)
        streaming_config = load_yaml(streaming_config_path)
        coturn_deployment = load_yaml(coturn_deployment_path)
    except (OSError, yaml.YAMLError) as exc:
        errors.append(f"streaming semantic validation could not load YAML: {exc}")
        return

    if not all(isinstance(value, dict) for value in (
        compose,
        mediamtx,
        prometheus,
        kustomization,
        statefulset,
        hpa,
        streaming_config,
        coturn_deployment,
    )):
        errors.append("streaming semantic validation expected YAML mappings")
        return

    services = compose.get("services", {})
    required_services = {"mediamtx", "coturn", "recording-uploader"}
    require(
        required_services.issubset(services),
        compose_path,
        "must define MediaMTX, Coturn, and recording-uploader services",
        errors,
    )
    if not required_services.issubset(services):
        return

    required_compose_variables = set(
        re.findall(r"\$\{([A-Z][A-Z0-9_]*):\?", compose_path.read_text(encoding="utf-8"))
    )
    example_variables = {
        line.split("=", 1)[0]
        for line in env_example_path.read_text(encoding="utf-8").splitlines()
        if line and not line.startswith("#") and "=" in line
    }
    require(
        required_compose_variables.issubset(example_variables),
        env_example_path,
        "must declare every variable required by Compose",
        errors,
    )

    mediamtx_service = services["mediamtx"]
    coturn_service = services["coturn"]
    uploader_service = services["recording-uploader"]
    require(
        mediamtx_service.get("image") == "bluenviron/mediamtx:1.19.3-ffmpeg",
        compose_path,
        "MediaMTX must use the pinned official 1.19.3-ffmpeg image",
        errors,
    )
    require(
        coturn_service.get("image") == "coturn/coturn:4.16.0",
        compose_path,
        "Coturn must use the pinned official 4.16.0 image",
        errors,
    )
    require(
        uploader_service.get("image") == "rclone/rclone:1.74.4",
        compose_path,
        "recording uploader must use the pinned official rclone 1.74.4 image",
        errors,
    )
    for service_name, service in (
        ("mediamtx", mediamtx_service),
        ("coturn", coturn_service),
        ("recording-uploader", uploader_service),
    ):
        require(
            isinstance(service.get("healthcheck"), dict),
            compose_path,
            f"{service_name} must define a healthcheck",
            errors,
        )
        require(
            isinstance(service.get("deploy", {}).get("resources", {}).get("limits"), dict),
            compose_path,
            f"{service_name} must define resource limits",
            errors,
        )

    published = [str(port) for port in mediamtx_service.get("ports", [])]
    required_media_ports = ("1935:1935", "8888:8888", "8889:8889", "9996:9996")
    for port in required_media_ports:
        require(
            any(item.startswith("127.0.0.1:") and port in item for item in published),
            compose_path,
            f"MediaMTX port {port} must be published on loopback",
            errors,
        )
    require(
        not any(":9997" in item or ":9998" in item for item in published),
        compose_path,
        "MediaMTX API and metrics ports must not be host-published",
        errors,
    )
    required_env = (
        "MTX_AUTHINTERNALUSERS_0_USER",
        "MTX_AUTHINTERNALUSERS_0_PASS",
        "MTX_AUTHINTERNALUSERS_1_USER",
        "MTX_AUTHINTERNALUSERS_1_PASS",
        "MTX_AUTHINTERNALUSERS_2_USER",
        "MTX_AUTHINTERNALUSERS_2_PASS",
        "MTX_WEBRTCADDITIONALHOSTS",
        "MTX_WEBRTCICESERVERS2_0_PASSWORD",
    )
    media_environment = mediamtx_service.get("environment", {})
    require(
        all(
            key in media_environment and ":?" in str(media_environment[key])
            for key in required_env
        ),
        compose_path,
        "MediaMTX credentials and public WebRTC hosts must be required environment values",
        errors,
    )
    turn_environment = coturn_service.get("environment", {})
    require(
        all(
            key in turn_environment and ":?" in str(turn_environment[key])
            for key in ("TURN_REALM", "TURN_USERNAME", "TURN_SECRET", "TURN_PUBLIC_IP")
        ),
        compose_path,
        "Coturn realm, user, secret, and public IP must be required environment values",
        errors,
    )

    require(
        all(mediamtx.get(key) is True for key in ("api", "metrics", "playback", "rtmp", "hls", "webrtc", "srt")),
        mediamtx_path,
        "API, metrics, playback, RTMP, HLS, WebRTC, and SRT must be enabled",
        errors,
    )
    require(
        mediamtx.get("pathDefaults", {}).get("record") is True,
        mediamtx_path,
        "recording must be enabled in path defaults",
        errors,
    )
    require(
        str(mediamtx.get("pathDefaults", {}).get("recordPath", "")).startswith(
            "/recordings/"
        ),
        mediamtx_path,
        "recordings must be written to the persistent recording mount",
        errors,
    )
    require(
        mediamtx.get("webrtcICEServers2", [{}])[0].get("clientOnly") is True,
        mediamtx_path,
        "the browser TURN server must be marked clientOnly",
        errors,
    )
    api_users = mediamtx.get("authInternalUsers", [])
    require(
        any(
            permission.get("action") == "api"
            for user in api_users
            for permission in user.get("permissions", [])
        ),
        mediamtx_path,
        "an authenticated API permission boundary is required",
        errors,
    )

    coturn_text = coturn_path.read_text(encoding="utf-8")
    for marker in (
        "lt-cred-mech",
        "min-port=49160",
        "max-port=49200",
        "prometheus",
        "no-cli",
    ):
        require(
            marker in coturn_text,
            coturn_path,
            f"missing required Coturn setting {marker}",
            errors,
        )
    require(
        "static-auth-secret=" not in coturn_text and "\nuser=" not in coturn_text,
        coturn_path,
        "must not embed TURN credentials",
        errors,
    )

    uploader_text = uploader_path.read_text(encoding="utf-8")
    for marker in ("rclone rcd", "sync/copy", '"MinAge":"2m"'):
        require(
            marker in uploader_text,
            uploader_path,
            f"missing durable uploader behavior {marker}",
            errors,
        )

    jobs = {
        item.get("job_name")
        for item in prometheus.get("scrape_configs", [])
        if isinstance(item, dict)
    }
    require(
        {"mediamtx", "coturn", "recording-uploader"}.issubset(jobs),
        prometheus_path,
        "must scrape MediaMTX, Coturn, and recording-uploader metrics",
        errors,
    )
    alerts_text = alerts_path.read_text(encoding="utf-8")
    for alert in (
        "SyloraStreamPathUnavailable",
        "SyloraStreamingIngestDown",
        "SyloraRecordingUploadFailure",
        "SyloraStreamingViewerDrop",
        "SyloraStreamingInboundBitrateLow",
    ):
        require(alert in alerts_text, alerts_path, f"missing alert {alert}", errors)

    resources = set(kustomization.get("resources", []))
    required_resources = {
        "streaming-configmap.yaml",
        "streaming-pvc.yaml",
        "mediamtx-statefulset.yaml",
        "coturn-deployment.yaml",
        "streaming-services.yaml",
        "streaming-hpa.yaml",
        "streaming-pdb.yaml",
    }
    require(
        required_resources.issubset(resources),
        kustomization_path,
        "must render all core streaming resources",
        errors,
    )
    require(
        statefulset.get("kind") == "StatefulSet"
        and statefulset.get("spec", {}).get("replicas") == 1,
        statefulset_path,
        "MediaMTX recording origin must be a single-replica StatefulSet",
        errors,
    )
    require(
        hpa.get("spec", {}).get("maxReplicas") == 1,
        hpa_path,
        "MediaMTX HPA must remain capped until path-aware routing exists",
        errors,
    )
    pod_containers = statefulset.get("spec", {}).get("template", {}).get("spec", {}).get(
        "containers", []
    )
    require(
        any(
            container.get("name") == "mediamtx"
            and container.get("image") == "bluenviron/mediamtx:1.19.3-ffmpeg"
            for container in pod_containers
        )
        and any(
            container.get("name") == "recording-uploader"
            and container.get("image") == "rclone/rclone:1.74.4"
            for container in pod_containers
        ),
        statefulset_path,
        "Kubernetes must use the pinned MediaMTX and rclone images",
        errors,
    )
    coturn_containers = (
        coturn_deployment.get("spec", {})
        .get("template", {})
        .get("spec", {})
        .get("containers", [])
    )
    require(
        any(
            container.get("name") == "coturn"
            and container.get("image") == "coturn/coturn:4.16.0"
            for container in coturn_containers
        ),
        coturn_deployment_path,
        "Kubernetes must use the pinned official Coturn image",
        errors,
    )
    embedded_mediamtx = yaml.safe_load(
        streaming_config.get("data", {}).get("mediamtx.yml", "")
    )
    require(
        isinstance(embedded_mediamtx, dict)
        and all(
            embedded_mediamtx.get(key) is True
            for key in ("api", "metrics", "playback", "rtmp", "hls", "webrtc", "srt")
        )
        and embedded_mediamtx.get("pathDefaults", {}).get("record") is True,
        streaming_config_path,
        "embedded Kubernetes MediaMTX config must preserve protocols and recording",
        errors,
    )

    with services_path.open(encoding="utf-8") as handle:
        service_documents = [
            document for document in yaml.safe_load_all(handle) if document is not None
        ]
    turn_service = next(
        (
            document
            for document in service_documents
            if document.get("metadata", {}).get("name") == "sylora-coturn"
        ),
        {},
    )
    relay_ports = {
        port.get("port")
        for port in turn_service.get("spec", {}).get("ports", [])
        if str(port.get("name", "")).startswith("relay-")
    }
    require(
        relay_ports == set(range(49160, 49201)),
        services_path,
        "Coturn Service must expose the complete configured UDP relay range",
        errors,
    )

    with dashboard_path.open(encoding="utf-8") as handle:
        dashboard = json.load(handle)
    dashboard_expressions = " ".join(
        target.get("expr", "")
        for panel in dashboard.get("panels", [])
        for target in panel.get("targets", [])
    )
    for metric in (
        "paths_readers",
        "paths_inbound_bytes",
        "paths_outbound_bytes",
        "rclone_errors_total",
    ):
        require(
            metric in dashboard_expressions,
            dashboard_path,
            f"dashboard is missing metric {metric}",
            errors,
        )


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
        INFRASTRUCTURE / "streaming" / "mediamtx.yml",
        INFRASTRUCTURE / "streaming" / "turnserver.conf",
        INFRASTRUCTURE / "streaming" / "start-coturn.sh",
        INFRASTRUCTURE / "streaming" / "upload-recordings.sh",
        INFRASTRUCTURE / "streaming" / "README.md",
        INFRASTRUCTURE / "streaming" / "OBS_COMPANION.md",
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-configmap.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-pvc.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "mediamtx-statefulset.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "coturn-deployment.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-services.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-hpa.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-pdb.yaml",
        INFRASTRUCTURE / "kubernetes" / "base" / "streaming-servicemonitor.yaml",
        WORKFLOWS / "ci.yml",
        WORKFLOWS / "deploy.yml",
    )
    for path in required:
        if not path.is_file():
            errors.append(f"{path.relative_to(ROOT)}: required file is missing")

    validate_streaming_semantics(errors)

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
