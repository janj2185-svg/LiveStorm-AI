from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"ok": True, "service": "sylora-api", "product": "Project-Sylora-2"}


@router.get("/v1/status")
def status() -> dict:
    return {
        "product": "Sylora",
        "class": "AI-native ecosystem",
        "core": [
            "HUMAN",
            "PERSONAL_AI",
            "DIGITAL_IDENTITY",
            "KNOWLEDGE",
            "CREATOR_BUSINESS_ECONOMY",
            "DEVELOPER_ECOSYSTEM",
        ],
        "status": "phase1_foundation",
    }
