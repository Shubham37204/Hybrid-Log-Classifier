from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.api.routes import classify, health
from app.api.routes.classify import get_orchestrator
from app.pipeline.orchestrator import Orchestrator

load_dotenv()
log = structlog.get_logger()

# ── Singleton ─────────────────────────────────────────────────────────────────

_orchestrator: Orchestrator | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    global _orchestrator
    log.info("app.startup")
    _orchestrator = Orchestrator()   # init all 3 tiers once at startup
    yield
    log.info("app.shutdown")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Hybrid Log Classifier",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dependency Override ───────────────────────────────────────────────────────

def _get_orchestrator() -> Orchestrator:
    return _orchestrator

app.dependency_overrides[get_orchestrator] = _get_orchestrator

# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(health.router)
app.include_router(classify.router, prefix="/api/v1")
