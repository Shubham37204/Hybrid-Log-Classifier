<div align="center">

<h1>🔍 Hybrid Log Classifier</h1>

<p>A production-grade 3-tier log classification pipeline that routes each log to the fastest tier confident enough to classify it.</p>

<p>
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/scikit--learn-1.5-F7931E?style=flat-square&logo=scikit-learn&logoColor=white"/>
  <img src="https://img.shields.io/badge/Groq-LLaMA_3.1-F55036?style=flat-square"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square"/>
</p>

</div>

---

## 🧠 How It Works

```
Log Input
    │
    ▼
┌──────────────────┐   match?     ──▶  return (confidence=1.0,  latency ~0.01ms)
│  Tier 1 · Regex  │
└──────────────────┘   no match
    │
    ▼
┌──────────────────┐   conf ≥ 0.80 ──▶  return (confidence=0.9x, latency ~1ms)
│  Tier 2 · ML     │   TF-IDF + Logistic Regression
└──────────────────┘   conf < 0.80
    │
    ▼
┌──────────────────┐   always  ──▶  return (confidence=0.85, latency ~400ms)
│  Tier 3 · LLM    │   Groq LLaMA 3.1 8B
└──────────────────┘
```

Regex handles ~70% of logs in microseconds. ML covers familiar patterns statistically. LLM is reserved for novel or ambiguous logs — minimizing cost and latency while maximizing coverage.

---

## 🏷️ Categories

| Badge | Category | Example Logs |
|---|---|---|
| 🔴 | `SECURITY_ALERT` | Multiple login failures, unauthorized access, brute force |
| 🔵 | `RESOURCE_USAGE` | phys_ram=64172MB, cpu_usage=94%, disk_usage=89% |
| 🟡 | `WORKFLOW_ERROR` | Escalation rule failed, invalid priority, task timeout |
| 🟢 | `SYSTEM_EVENT` | Service nginx started, backup completed, node joined cluster |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI · Python 3.12 · Uvicorn |
| **ML** | scikit-learn · TF-IDF · Logistic Regression · joblib |
| **LLM** | Groq API · LLaMA 3.1 8B Instant |
| **Data Pipeline** | Faker · PyYAML · synthetic dataset (4,000 rows · seed=42) |
| **Frontend** | Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui |
| **Observability** | structlog · Prometheus |
| **Testing** | pytest |

---

## 📁 Project Structure

```
hybrid-log-classifier/
├── backend/
│   ├── app/
│   │   ├── classifier/
│   │   │   ├── regex_classifier.py     # Tier 1 — deterministic pattern matching
│   │   │   ├── ml_classifier.py        # Tier 2 — TF-IDF + Logistic Regression
│   │   │   └── llm_classifier.py       # Tier 3 — Groq LLM fallback
│   │   ├── pipeline/
│   │   │   └── orchestrator.py         # Confidence-threshold routing logic
│   │   ├── api/
│   │   │   ├── routes/classify.py      # POST /api/v1/classify
│   │   │   └── schemas/                # Pydantic request + response models
│   │   └── training/
│   │       ├── data_generator.py       # Template → Faker → logs.csv
│   │       └── trainer.py              # Train + serialize model artifacts
│   ├── config/
│   │   └── patterns.yaml               # Externalized regex pattern registry
│   ├── data/raw/
│   │   ├── logs.csv                    # 4,000 synthetic log rows
│   │   └── log_templates.yaml          # Template definitions per category
│   └── models/
│       ├── tfidf_vectorizer.joblib
│       ├── logistic_regression.joblib
│       └── metadata.json               # Version, trained_at, f1_score
│
└── frontend/
    └── src/
        ├── app/page.tsx                # Landing page + classifier UI
        ├── components/
        │   ├── PipelineTrace.tsx       # Visual tier decision trace
        │   └── ResultCard.tsx
        └── lib/api.ts                  # Typed backend API client
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Groq API key → [console.groq.com](https://console.groq.com) (free tier available)

### Backend Setup

```bash
cd backend

# Virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install
pip install -r requirements.txt

# Environment
cp .env.example .env
# Set GROQ_API_KEY in .env

# Generate dataset (4,000 rows, seed=42)
python -m app.training.data_generator

# Train ML model
python -m app.training.trainer

# Start server
uvicorn app.main:app --reload --port 8000
```

> Swagger UI: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> App: `http://localhost:3000`

---

## 🔌 API Reference

### `POST /api/v1/classify`

**Request**
```json
{
  "text": "Multiple login failures for user 9052"
}
```

**Response**
```json
{
  "category": "SECURITY_ALERT",
  "confidence": 1.0,
  "classifier_used": "regex",
  "matched_pattern": "multiple.{0,10}login.{0,10}fail",
  "latency_ms": 0.005
}
```

| Field | Type | Description |
|---|---|---|
| `category` | `string` | `SECURITY_ALERT` · `RESOURCE_USAGE` · `WORKFLOW_ERROR` · `SYSTEM_EVENT` |
| `confidence` | `float` | `1.0` regex · `0.80–1.0` ML probability · `0.85` LLM fixed |
| `classifier_used` | `string` | Winning tier: `regex` · `ml` · `llm` |
| `matched_pattern` | `string\|null` | Regex string that matched (regex tier only) |
| `latency_ms` | `float` | Time taken by the winning tier in milliseconds |

---

## 🧪 Dataset & Training

**Synthetic data pipeline — 3 steps:**

```
log_templates.yaml   →   data_generator.py   →   logs.csv
LLM-augmented            Faker fills              4,000 rows
template registry        placeholders             1,000 / class
                         seed=42
```

**Model performance on held-out test set (800 rows):**

```
               precision    recall  f1-score   support
RESOURCE_USAGE    1.00      1.00      1.00       200
SECURITY_ALERT    1.00      1.00      1.00       200
  SYSTEM_EVENT    1.00      1.00      1.00       200
WORKFLOW_ERROR    1.00      1.00      1.00       200
      accuracy                        1.00       800
```

> F1 = 1.0 is expected on synthetic data — train and test share the same template structure. The LLM tier handles out-of-distribution logs that ML would misclassify.

---

## 🎯 Key Engineering Decisions

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| ML model | TF-IDF + LogReg | BERT | Overkill for 4k structured logs |
| Routing | Confidence threshold | Sample-count routing | Stateless, testable, production-standard |
| LLM role | Fallback only | Primary classifier | Minimize cost + latency |
| Frontend | Next.js + TypeScript | Streamlit | Streamlit is a resume red flag for SWE roles |
| Data gen | Templates + Faker | Raw LLM output | Reproducible (seed=42), diverse, scalable |
| Patterns | External YAML | Hardcoded regex | Config change, not code change |

---

## 🚀 Roadmap

- [ ] Pipeline trace metadata in API response
- [ ] Model versioning via `metadata.json`  
- [ ] Prometheus metrics dashboard
- [ ] Docker Compose for one-command startup
- [ ] Real log dataset integration (LogHub — HDFS, BGL)
- [ ] Rate limiting + API key auth

---

## 👤 Author

**Shubham Bhardwaj**

[![GitHub](https://img.shields.io/badge/GitHub-Shubham37204-181717?style=flat-square&logo=github)](https://github.com/Shubham37204)

---

<div align="center">
<sub>Built with FastAPI · Next.js · scikit-learn · Groq · structlog · pytest</sub>
</div>
