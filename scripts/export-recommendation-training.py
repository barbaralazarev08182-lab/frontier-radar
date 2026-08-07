"""把 recommendation_training_v1 导出为本地 JSONL 训练集。

不会上传用户原始 visitor_id；导出时用 SHA-256 做稳定匿名化。
用法：python scripts/export-recommendation-training.py
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import requests


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    for filename in (".env.local", ".env"):
        path = Path.cwd() / filename
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return env


def anon(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:24]


def main() -> None:
    env = load_env()
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "") or env.get("SUPABASE_SECRET_KEY", "")
    if not base_url or not key:
        raise SystemExit("缺少 Supabase 配置")

    response = requests.get(
        f"{base_url}/rest/v1/recommendation_training_v1",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        params={"select": "*", "order": "event_created_at.asc", "limit": "10000"},
        timeout=60,
    )
    response.raise_for_status()
    rows = response.json()

    output_dir = Path.cwd() / "data"
    output_dir.mkdir(exist_ok=True)
    output = output_dir / "recommendation-training.jsonl"
    with output.open("w", encoding="utf-8") as handle:
        for row in rows:
            visitor_id = str(row.pop("visitor_id", ""))
            row["visitor_key"] = anon(visitor_id) if visitor_id else None
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(json.dumps({"status": "success", "rows": len(rows), "output": str(output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
