import csv
import random
import time
from pathlib import Path

import yaml
import structlog
from faker import Faker

log = structlog.get_logger()

# ── Constants ─────────────────────────────────────────────────────────────────

SEED = 42
ROWS_PER_CLASS = 1000
OUTPUT_PATH = Path("data/raw/logs.csv")
TEMPLATES_PATH = Path("data/raw/log_templates.yaml")


# ── Placeholder Fillers ───────────────────────────────────────────────────────

def _make_filler(fake: Faker) -> dict:
    # Called once per row — fresh random values each time
    # Add new placeholders here if templates expand
    # Keep numeric ranges realistic — they affect ML feature space
    return {
        "user_id":     random.randint(1000, 9999),
        "ip":          fake.ipv4(),
        "server_id":   random.randint(1, 100),
        "host":        fake.hostname(),
        "attempts":    random.randint(3, 20),
        "session_id":  fake.uuid4()[:8],
        "ram":         random.choice([8192, 16384, 32768, 65536]),
        "used_ram":    random.randint(512, 60000),
        "disk":        random.randint(50, 2000),
        "disk_pct":    random.randint(60, 99),
        "cpu":         random.randint(1, 100),
        "memory":      random.randint(1, 100),
        "swap":        random.randint(256, 8192),
        "volume":      f"vol-{fake.lexify('????')}",
        "instance_id": fake.lexify("????????"),
        "node_id":     f"node-{random.randint(1, 50)}",
        "ticket_id":   random.randint(1000, 9999),
        "team_id":     random.randint(100, 999),
        "queue_id":    random.randint(1, 20),
        "process_id":  fake.uuid4()[:8],
        "timeout":     random.choice([30, 60, 120, 300]),
        "task_id":     random.randint(100, 9999),
        "workflow_id": fake.uuid4()[:8],
        "step":        random.randint(1, 10),
        "priority":    random.choice(["P1", "P2", "P3", "LOW", "HIGH"]),
        "job_id":      random.randint(1000, 9999),
        "service":     random.choice([
                           "nginx", "postgres", "redis",
                           "auth-service", "api-gateway",
                           "worker", "scheduler"
                       ]),
        "db":          random.choice([
                           "users_db", "orders_db",
                           "analytics_db", "logs_db"
                       ]),
        "cluster_id":  f"cluster-{random.randint(1, 5)}",
        "deploy_id":   fake.uuid4()[:8],
        "region":      random.choice([
                           "us-east-1", "us-west-2",
                           "eu-west-1", "ap-south-1"
                       ]),
        "timestamp":   fake.date_time_this_year().strftime("%Y-%m-%dT%H:%M:%S"),
        "port":        random.choice([80, 443, 8080, 5432, 6379]),
    }


# ── Core Generator ────────────────────────────────────────────────────────────

def _load_templates(path: Path) -> dict[str, list[str]]:
    if not path.exists():
        raise FileNotFoundError(f"Templates not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError("log_templates.yaml must be a mapping")
    return data


def _fill_template(template: str, filler: dict) -> str:
    # str.format_map — KeyError if placeholder missing from filler
    # Intentional: missing placeholder = bug in filler dict, fail loud
    try:
        return template.format_map(filler)
    except KeyError as e:
        raise KeyError(
            f"Missing placeholder {e} in filler. "
            f"Template: '{template}'"
        ) from e


def generate(
    templates_path: Path = TEMPLATES_PATH,
    output_path: Path = OUTPUT_PATH,
    rows_per_class: int = ROWS_PER_CLASS,
    seed: int = SEED,
) -> None:
    # seed both random and Faker for full reproducibility
    random.seed(seed)
    fake = Faker()
    Faker.seed(seed)

    log.info(
        "data_generator.started",
        rows_per_class=rows_per_class,
        seed=seed,
        output=str(output_path),
    )

    templates = _load_templates(templates_path)
    rows: list[dict] = []
    start = time.perf_counter()

    for category, template_list in templates.items():
        generated = 0

        while generated < rows_per_class:
            # cycle through templates — each gets roughly equal representation
            template = template_list[generated % len(template_list)]
            filler = _make_filler(fake)
            text = _fill_template(template, filler)

            rows.append({"text": text, "category": category})
            generated += 1

        log.info(
            "data_generator.category_done",
            category=category,
            count=generated,
        )

    # shuffle AFTER all rows generated — preserves seed determinism
    random.shuffle(rows)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "category"])
        writer.writeheader()
        writer.writerows(rows)

    elapsed = (time.perf_counter() - start) * 1000

    log.info(
        "data_generator.complete",
        total_rows=len(rows),
        output=str(output_path),
        elapsed_ms=round(elapsed, 2),
    )


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    generate()
    