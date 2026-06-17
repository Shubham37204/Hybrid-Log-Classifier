import re
import time
from enum import Enum
from dataclasses import dataclass
from typing import Optional
from pathlib import Path

import yaml
import structlog

# from app.observability.metrics import (
#     regex_classifications_total,
#     regex_unknown_total,
#     regex_errors_total,
# )

log = structlog.get_logger()


# ── Enums ─────────────────────────────────────────────────────────────────────

class LogCategory(str, Enum):
    SECURITY_ALERT = "SECURITY_ALERT"
    RESOURCE_USAGE = "RESOURCE_USAGE"
    WORKFLOW_ERROR = "WORKFLOW_ERROR"
    SYSTEM_EVENT = "SYSTEM_EVENT"
    UNKNOWN = "UNKNOWN"


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ClassificationResult:
    category: LogCategory
    confidence: float
    classifier_used: str
    matched_pattern: Optional[str]
    latency_ms: float


# ── RegexClassifier ───────────────────────────────────────────────────────────

class RegexClassifier:
    MAX_INPUT_LENGTH = 10_000

    def __init__(self, patterns_path: Path):
        self._patterns = self._load_and_compile_patterns(patterns_path)

        total_patterns = sum(
            len(patterns)
            for patterns in self._patterns.values()
        )

        log.info(
            "regex_classifier.initialized",
            categories=len(self._patterns),
            total_patterns=total_patterns,
        )

    def _load_and_compile_patterns(
        self,
        path: Path,
    ) -> dict[LogCategory, list[re.Pattern]]:
        if not path.exists():
            raise FileNotFoundError(
                f"patterns.yaml not found: {path}"
            )

        with path.open("r", encoding="utf-8") as file:
            raw_patterns = yaml.safe_load(file)

        if not isinstance(raw_patterns, dict):
            raise ValueError(
                "patterns.yaml must contain a mapping"
            )

        compiled_patterns: dict[
            LogCategory,
            list[re.Pattern]
        ] = {}

        for category_name, patterns in raw_patterns.items():

            try:
                category = LogCategory(category_name)
            except ValueError as exc:
                raise ValueError(
                    f"Unknown category in patterns.yaml: {category_name}"
                ) from exc

            # UNKNOWN is a reserved sentinel value — not a matchable category
            if category == LogCategory.UNKNOWN:
                raise ValueError(
                    "UNKNOWN is a reserved category, do not define patterns for it"
                )

            if not isinstance(patterns, list) or len(patterns) == 0:
                raise ValueError(
                    f"No patterns for category: {category_name}"
                )

            category_patterns: list[re.Pattern] = []

            for pattern in patterns:
                try:
                    compiled = re.compile(
                        pattern,
                        re.IGNORECASE | re.MULTILINE,
                    )
                    category_patterns.append(compiled)

                except re.error as exc:
                    raise ValueError(
                        f"Invalid regex pattern '{pattern}': {exc}"
                    ) from exc

            compiled_patterns[category] = category_patterns

        return compiled_patterns

    def classify(
        self,
        text: str,
    ) -> ClassificationResult:
        # TypeError intentionally outside try/except — caller contract violation, not runtime error
        if not isinstance(text, str):
            raise TypeError("Input must be str")

        text = text.strip()

        if not text:
            log.warning("regex.empty_input")
            return ClassificationResult(
                category=LogCategory.UNKNOWN,
                confidence=0.0,
                classifier_used="regex",
                matched_pattern=None,
                latency_ms=0.0,
            )

        if len(text) > self.MAX_INPUT_LENGTH:
            log.warning(
                "regex.input_truncated",
                original_length=len(text),
            )
            text = text[: self.MAX_INPUT_LENGTH]

        start = time.perf_counter()

        try:
            category, matched_pattern = self._match(text)

        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000

            log.error(
                "regex.classify_error",
                error=str(exc),
                input_preview=text[:100],
            )

            # regex_errors_total.inc()

            return ClassificationResult(
                category=LogCategory.UNKNOWN,
                confidence=0.0,
                classifier_used="regex",
                matched_pattern=None,
                latency_ms=latency_ms,
            )

        latency_ms = (time.perf_counter() - start) * 1000

        if category != LogCategory.UNKNOWN:
            log.info(
                "regex.match",
                category=category.value,
                pattern=matched_pattern,
                latency_ms=round(latency_ms, 3),
            )
            # regex_classifications_total.labels(category=category.value).inc()

        else:
            log.warning(
                "regex.unknown",
                input_preview=text[:100],
                latency_ms=round(latency_ms, 3),
            )
            # regex_unknown_total.inc()

        return ClassificationResult(
            category=category,
            confidence=(
                1.0 if category != LogCategory.UNKNOWN else 0.0
            ),
            classifier_used="regex",
            matched_pattern=matched_pattern,
            latency_ms=latency_ms,
        )

    def _match(
        self,
        text: str,
    ) -> tuple[LogCategory, Optional[str]]:
        # YAML order = priority order.
        # SECURITY_ALERT must appear first in patterns.yaml —
        # security incidents have highest business priority.
        for category, patterns in self._patterns.items():
            for pattern in patterns:
                if pattern.search(text):
                    return (category, pattern.pattern)

        return (LogCategory.UNKNOWN, None)
    