from fastapi import APIRouter, Depends, HTTPException
import structlog

from app.api.schemas.request import ClassifyRequest
from app.api.schemas.response import ClassifyResponse
from app.pipeline.orchestrator import Orchestrator

log = structlog.get_logger()
router = APIRouter()


def get_orchestrator() -> Orchestrator:
    # Dependency injection — orchestrator injected per request
    # In main.py we override this with the singleton instance
    raise NotImplementedError("Orchestrator not wired")


@router.post("/classify", response_model=ClassifyResponse)
async def classify(
    request: ClassifyRequest,
    orchestrator: Orchestrator = Depends(get_orchestrator),
) -> ClassifyResponse:
    try:
        result = orchestrator.classify(request.text)
    except Exception as exc:
        log.error("api.classify_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Classification failed")

    return ClassifyResponse(
        category=result.category.value,
        confidence=result.confidence,
        classifier_used=result.classifier_used,
        matched_pattern=result.matched_pattern,
        latency_ms=result.latency_ms,
    )
