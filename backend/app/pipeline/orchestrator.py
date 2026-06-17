import time
from pathlib import Path

import structlog

from app.classifier.regex_classifier import (
    ClassificationResult,
    LogCategory,
    RegexClassifier,
)
from app.classifier.ml_classifier import MLClassifier
from app.classifier.llm_classifier import LLMClassifier

log = structlog.get_logger()

# ── Constants ─────────────────────────────────────────────────────────────────

ML_CONFIDENCE_THRESHOLD = 0.80

PATTERNS_PATH = Path("app/config/patterns.yaml")
VECTORIZER_PATH = Path("models/tfidf_vectorizer.joblib")
MODEL_PATH = Path("models/logistic_regression.joblib")


# ── Orchestrator ──────────────────────────────────────────────────────────────

class Orchestrator:

    def __init__(self):
        # Initialize all 3 tiers at startup — not per-request
        # Fail fast: if any tier fails to init, app should not start
        self._regex = RegexClassifier(patterns_path=PATTERNS_PATH)
        self._ml = MLClassifier(
            vectorizer_path=VECTORIZER_PATH,
            model_path=MODEL_PATH,
        )
        self._llm = LLMClassifier()

        log.info("orchestrator.initialized")

    def classify(self, text: str) -> ClassificationResult:
        # TypeError bubbles up — same contract across all tiers
        if not isinstance(text, str):
            raise TypeError("Input must be str")

        start = time.perf_counter()

        # ── Tier 1: Regex ──────────────────────────────────────────────────
        regex_result = self._regex.classify(text)

        if regex_result.category != LogCategory.UNKNOWN:
            log.info(
                "orchestrator.decision",
                tier="regex",
                category=regex_result.category.value,
                confidence=regex_result.confidence,
            )
            return regex_result

        # ── Tier 2: ML ────────────────────────────────────────────────────
        ml_result = self._ml.classify(text)

        if (
            ml_result.category != LogCategory.UNKNOWN
            and ml_result.confidence >= ML_CONFIDENCE_THRESHOLD
        ):
            log.info(
                "orchestrator.decision",
                tier="ml",
                category=ml_result.category.value,
                confidence=ml_result.confidence,
            )
            return ml_result

        # ── Tier 3: LLM ───────────────────────────────────────────────────
        log.info(
            "orchestrator.escalating_to_llm",
            ml_confidence=round(ml_result.confidence, 4),
            reason=(
                "low_confidence"
                if ml_result.category != LogCategory.UNKNOWN
                else "ml_unknown"
            ),
        )

        llm_result = self._llm.classify(text)

        log.info(
            "orchestrator.decision",
            tier="llm",
            category=llm_result.category.value,
            confidence=llm_result.confidence,
        )

        return llm_result
