import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import structlog
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

log = structlog.get_logger()

# ── Constants ─────────────────────────────────────────────────────────────────

DATA_PATH    = Path("data/raw/logs.csv")
MODELS_DIR   = Path("models")
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
MODEL_PATH      = MODELS_DIR / "logistic_regression.joblib"
METADATA_PATH   = MODELS_DIR / "metadata.json"

TEST_SIZE   = 0.2
RANDOM_SEED = 42


# ── Data Loading ──────────────────────────────────────────────────────────────

def _load_data(path: Path) -> tuple[list[str], list[str]]:
    # 1. Check path.exists() → FileNotFoundError if missing
    # 2. pd.read_csv(path)
    # 3. Validate columns: must have "text" and "category"
    #    If missing → raise ValueError("logs.csv must have 'text' and 'category' columns")
    # 4. Drop rows where text or category is null → log how many dropped
    # 5. Validate no empty strings in text after strip
    # 6. Return (texts: list[str], labels: list[str])
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path)

    required = {"text", "category"}
    if not required.issubset(df.columns):
        raise ValueError(f"logs.csv must have columns: {required}")

    before = len(df)
    df = df.dropna(subset=["text", "category"])
    df["text"] = df["text"].str.strip()
    df = df[df["text"] != ""]
    after = len(df)

    if before != after:
        log.warning("trainer.dropped_rows", dropped=before - after)

    log.info("trainer.data_loaded", total_rows=after)
    return df["text"].tolist(), df["category"].tolist()


# ── Model Building ────────────────────────────────────────────────────────────

def _build_pipeline() -> Pipeline:
    # TF-IDF config reasoning:
    #   ngram_range=(1,2) → unigrams + bigrams. "login failure" as one feature.
    #   max_features=50_000 → caps vocabulary. Prevents memory blow-up on large corpora.
    #   sublinear_tf=True → log-scale TF. Reduces dominance of high-freq terms.
    #   min_df=2 → ignore terms appearing in only 1 document. Reduces noise.
    #
    # LogisticRegression config reasoning:
    #   C=1.0 → default regularization. Tune only if val metrics demand it.
    #   max_iter=1000 → default 100 often fails to converge on text data.
    #   class_weight="balanced" → handles class imbalance automatically.
    #   solver="lbfgs" → best for small-to-medium multiclass problems.

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=50_000,
        sublinear_tf=True,
        min_df=2,
    )

    classifier = LogisticRegression(
        C=1.0,
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
        random_state=RANDOM_SEED,
    )

    return Pipeline([
        ("tfidf", vectorizer),
        ("clf",   classifier),
    ])


# ── Evaluation ────────────────────────────────────────────────────────────────

def _evaluate(
    pipeline: Pipeline,
    X_test: list[str],
    y_test: list[str],
) -> dict:
    y_pred = pipeline.predict(X_test)

    report = classification_report(
        y_test,
        y_pred,
        output_dict=True,
    )

    macro_f1 = f1_score(y_test, y_pred, average="macro")

    log.info(
        "trainer.evaluation",
        macro_f1=round(macro_f1, 4),
    )

    # Print human-readable report to stdout — useful during training runs
    print(classification_report(y_test, y_pred))

    return {
        "macro_f1":        round(macro_f1, 4),
        "per_class":       report,
    }


# ── Serialization ─────────────────────────────────────────────────────────────

def _save_artifacts(
    pipeline: Pipeline,
    metrics: dict,
    trained_at: str,
) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Save vectorizer and model separately — not as one pipeline blob.
    # Reason: ml_classifier.py loads them independently.
    # Pipeline blob makes it harder to swap one component without retraining both.
    joblib.dump(pipeline.named_steps["tfidf"], VECTORIZER_PATH)
    joblib.dump(pipeline.named_steps["clf"],   MODEL_PATH)

    metadata = {
        "version":    "1.0.0",
        "trained_at": trained_at,
        "macro_f1":   metrics["macro_f1"],
        "test_size":  TEST_SIZE,
        "seed":       RANDOM_SEED,
        "per_class":  {
            k: {"f1": round(v["f1-score"], 4)}
            for k, v in metrics["per_class"].items()
            if k not in ("accuracy", "macro avg", "weighted avg")
        },
    }

    with METADATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    log.info(
        "trainer.artifacts_saved",
        vectorizer=str(VECTORIZER_PATH),
        model=str(MODEL_PATH),
        metadata=str(METADATA_PATH),
    )


# ── Entrypoint ────────────────────────────────────────────────────────────────

def train(
    data_path: Path = DATA_PATH,
    seed: int = RANDOM_SEED,
) -> None:
    log.info("trainer.started")
    start = time.perf_counter()

    texts, labels = _load_data(data_path)

    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=TEST_SIZE,
        random_state=seed,
        stratify=labels,      # preserves class distribution in both splits
    )

    log.info(
        "trainer.split",
        train=len(X_train),
        test=len(X_test),
    )

    pipeline = _build_pipeline()
    pipeline.fit(X_train, y_train)

    log.info("trainer.model_trained")

    metrics  = _evaluate(pipeline, X_test, y_test)
    trained_at = pd.Timestamp.now().isoformat()

    _save_artifacts(pipeline, metrics, trained_at)

    elapsed = (time.perf_counter() - start) * 1000
    log.info(
        "trainer.complete",
        elapsed_ms=round(elapsed, 2),
        macro_f1=metrics["macro_f1"],
    )


if __name__ == "__main__":
    train()
