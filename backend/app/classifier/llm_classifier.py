import os
import time
from pathlib import Path

import structlog
from groq import Groq

from app.classifier.regex_classifier import ClassificationResult, LogCategory

log = structlog.get_logger()

# ── Constants ─────────────────────────────────────────────────────────────────

GROQ_MODEL      = "llama3-8b-8192"   # fast, cheap, good enough for classification
MAX_TOKENS      = 20                  # we only need one word back
TEMPERATURE     = 0.0                 # deterministic — classification is not creative
VALID_CATEGORIES = {c.value for c in LogCategory if c != LogCategory.UNKNOWN}

SYSTEM_PROMPT = """You are a log classification engine.
Classify the given log message into exactly one of these categories:
SECURITY_ALERT, RESOURCE_USAGE, WORKFLOW_ERROR, SYSTEM_EVENT

Rules:
- Respond with ONLY the category name. Nothing else.
- No explanation. No punctuation. No markdown.
- If unsure, pick the closest match. Never say UNKNOWN.

Examples:
Log: "Multiple login failures for user 9052"
SECURITY_ALERT

Log: "phys_ram=64172MB used_ram=512MB"
RESOURCE_USAGE

Log: "Escalation rule failed for ticket 4821"
WORKFLOW_ERROR

Log: "Service nginx started successfully"
SYSTEM_EVENT"""


# ── LLMClassifier ─────────────────────────────────────────────────────────────

class LLMClassifier:

    def __init__(self):
        # 1. Read GROQ_API_KEY from environment
        #    api_key = os.environ.get("GROQ_API_KEY")
        # 2. If missing → raise EnvironmentError(
        #       "GROQ_API_KEY not set. Add it to .env"
        #    )
        # 3. self._client = Groq(api_key=api_key)
        # 4. log.info("llm_classifier.initialized", model=GROQ_MODEL)

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY not set. Add it to .env"
            )

        self._client = Groq(api_key=api_key)
        log.info("llm_classifier.initialized", model=GROQ_MODEL)

    def classify(self, text: str) -> ClassificationResult:
        # TypeError bubbles up — same contract as other tiers
        if not isinstance(text, str):
            raise TypeError("Input must be str")

        text = text.strip()

        if not text:
            log.warning("llm.empty_input")
            return ClassificationResult(
                category=LogCategory.UNKNOWN,
                confidence=0.0,
                classifier_used="llm",
                matched_pattern=None,
                latency_ms=0.0,
            )

        start = time.perf_counter()

        try:
            category = self._call_groq(text)

        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            log.error(
                "llm.classify_error",
                error=str(exc),
                input_preview=text[:100],
            )
            # LLM is last resort. If it fails → return UNKNOWN.
            # Do not re-raise. Orchestrator must always get a result.
            return ClassificationResult(
                category=LogCategory.UNKNOWN,
                confidence=0.0,
                classifier_used="llm",
                matched_pattern=None,
                latency_ms=latency_ms,
            )

        latency_ms = (time.perf_counter() - start) * 1000

        log.info(
            "llm.classified",
            category=category.value,
            latency_ms=round(latency_ms, 3),
        )

        return ClassificationResult(
            category=category,
            confidence=0.85,   # fixed — LLM gives no probability score
            classifier_used="llm",
            matched_pattern=None,
            latency_ms=latency_ms,
        )

    def _call_groq(self, text: str) -> LogCategory:
        # 1. self._client.chat.completions.create(...)
        #    model=GROQ_MODEL
        #    messages=[
        #        {"role": "system", "content": SYSTEM_PROMPT},
        #        {"role": "user",   "content": f"Log: {text}"}
        #    ]
        #    max_tokens=MAX_TOKENS
        #    temperature=TEMPERATURE
        #
        # 2. Extract: raw = response.choices[0].message.content
        # 3. Clean:   raw = raw.strip().upper()
        #
        # 4. Validate against VALID_CATEGORIES:
        #    if raw not in VALID_CATEGORIES:
        #        log.warning("llm.invalid_response", raw=raw, input_preview=text[:100])
        #        raise ValueError(f"LLM returned invalid category: '{raw}'")
        #
        # 5. return LogCategory(raw)

        response = self._client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Log: {text}"},
            ],
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )

        raw = response.choices[0].message.content.strip().upper()

        if raw not in VALID_CATEGORIES:
            log.warning(
                "llm.invalid_response",
                raw=raw,
                input_preview=text[:100],
            )
            raise ValueError(f"LLM returned invalid category: '{raw}'")

        return LogCategory(raw)
    