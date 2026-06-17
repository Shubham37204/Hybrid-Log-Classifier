import time
from pathlib import Path

import joblib
import numpy as np
import structlog

from app.classifier.regex_classifier import ClassificationResult, LogCategory

log = structlog.get_logger()

# ── Constants ─────────────────────────────────────────────────────────────────

MODELS_DIR       = Path("models")
VECTORIZER_PATH  = MODELS_DIR / "tfidf_vectorizer.joblib"
MODEL_PATH       = MODELS_DIR / "logistic_regression.joblib"

# Confidence floor — below this ML result is treated as uncertain
# Even if confidence >= ML_THRESHOLD in orchestrator, this guards
# against ML returning a wrong-but-confident answer on OOD input
CONFIDENCE_FLOOR = 0.40


# ── MLClassifier ──────────────────────────────────────────────────────────────

class MLClassifier:

    def __init__(
        self,
        vectorizer_path: Path = VECTORIZER_PATH,
        model_path: Path = MODEL_PATH,
    ):
        # 1. Check both paths exist → FileNotFoundError if missing
        #    Clear message: "Model not found. Run trainer.py first."
        # 2. joblib.load() vectorizer and model separately
        # 3. Store as self._vectorizer, self._model
        # 4. Cache label order: self._classes = list(self._model.classes_)
        #    Needed to map probability array index → LogCategory
        # 5. log.info("ml_classifier.initialized", classes=self._classes)
        if not vectorizer_path.exists():
            raise FileNotFoundError(
                f"Vectorizer not found at {vectorizer_path}. "
                "Run trainer.py first."
            )
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Run trainer.py first."
            )

        self._vectorizer = joblib.load(vectorizer_path)
        self._model      = joblib.load(model_path)
        self._classes    = list(self._model.classes_)

        log.info(
            "ml_classifier.initialized",
            classes=self._classes,
        )

    def classify(self, text: str) -> ClassificationResult:
        # TypeError bubbles up — same contract as RegexClassifier
        if not isinstance(text, str):
            raise TypeError("Input must be str")

        text = text.strip()

        if not text:
            log.warning("ml.empty_input")
            return ClassificationResult(
                category=LogCategory.UNKNOWN,
                confidence=0.0,
                classifier_used="ml",
                matched_pattern=None,
                latency_ms=0.0,
            )

        start = time.perf_counter()

        try:
            category, confidence = self._predict(text)

        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            log.error(
                "ml.classify_error",
                error=str(exc),
                input_preview=text[:100],
            )
            return ClassificationResult(
                category=LogCategory.UNKNOWN,
                confidence=0.0,
                classifier_used="ml",
                matched_pattern=None,
                latency_ms=latency_ms,
            )

        latency_ms = (time.perf_counter() - start) * 1000

        log.info(
            "ml.classified",
            category=category.value,
            confidence=round(confidence, 4),
            latency_ms=round(latency_ms, 3),
        )

        return ClassificationResult(
            category=category,
            confidence=round(confidence, 4),
            classifier_used="ml",
            matched_pattern=None,
            latency_ms=latency_ms,
        )

    def _predict(self, text: str) -> tuple[LogCategory, float]:
        # 1. self._vectorizer.transform([text]) → sparse matrix
        # 2. self._model.predict_proba(X) → shape (1, n_classes)
        # 3. proba = probabilities[0]  → 1D array
        # 4. max_idx = np.argmax(proba)
        # 5. confidence = float(proba[max_idx])
        # 6. label = self._classes[max_idx]  → string like "SECURITY_ALERT"
        # 7. category = LogCategory(label)
        #
        # CONFIDENCE FLOOR:
        # If confidence < CONFIDENCE_FLOOR:
        #   log.warning("ml.low_confidence", confidence=confidence, label=label)
        #   return (LogCategory.UNKNOWN, confidence)
        #   Reason: ML is guessing. Better to send to LLM than return wrong answer.

        X = self._vectorizer.transform([text])
        proba = self._model.predict_proba(X)[0]

        max_idx    = int(np.argmax(proba))
        confidence = float(proba[max_idx])
        label      = self._classes[max_idx]

        if confidence < CONFIDENCE_FLOOR:
            log.warning(
                "ml.low_confidence",
                confidence=round(confidence, 4),
                top_label=label,
                input_preview=text[:100],
            )
            return (LogCategory.UNKNOWN, confidence)

        category = LogCategory(label)
        return (category, confidence)
    