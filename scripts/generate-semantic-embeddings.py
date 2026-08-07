"""Frontier Radar · 离线语义 Embedding 生成器。

默认模型：intfloat/multilingual-e5-small（384 维，中英混合）。
运行位置：开发者本机，不进入 Vercel 请求链路。

流程：
1. 从 frontier_feed_v1 读取内容；
2. 本地 SentenceTransformer 生成归一化语义向量；
3. 写入 item_semantic_embeddings；
4. 用已有 user_events 重建 user_semantic_profiles。

用法：
  python scripts/generate-semantic-embeddings.py
  python scripts/generate-semantic-embeddings.py --limit 200
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import requests
from sentence_transformers import SentenceTransformer

MODEL_NAME = "intfloat/multilingual-e5-small"
DIMENSIONS = 384


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
            value = value.strip().strip('"').strip("'")
            env.setdefault(key.strip(), value)
    return env


def headers(service_key: str, prefer: str | None = None) -> dict[str, str]:
    result = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        result["Prefer"] = prefer
    return result


def request_json(method: str, url: str, service_key: str, **kwargs: Any) -> Any:
    response = requests.request(method, url, headers=headers(service_key, kwargs.pop("prefer", None)), timeout=60, **kwargs)
    response.raise_for_status()
    if not response.content:
        return None
    return response.json()


def as_tags(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value if isinstance(v, str)]
    return []


def content_text(row: dict[str, Any]) -> str:
    parts = [
        row.get("title") or "",
        row.get("description") or "",
        row.get("summary_zh") or "",
        row.get("why_it_matters") or "",
        " ".join(as_tags(row.get("tags"))),
        row.get("source_slug") or "",
        row.get("content_type") or "",
    ]
    # E5 文档编码推荐 passage: 前缀。
    return "passage: " + "\n".join(str(part).strip() for part in parts if str(part).strip())


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fetch_feed(base_url: str, service_key: str, limit: int) -> list[dict[str, Any]]:
    params = {
        "select": "item_id,title,description,summary_zh,why_it_matters,tags,source_slug,content_type",
        "limit": str(limit),
        "order": "analysis_created_at.desc.nullslast,updated_at.desc.nullslast",
    }
    data = request_json("GET", f"{base_url}/rest/v1/frontier_feed_v1", service_key, params=params)
    return data if isinstance(data, list) else []


def upsert_embeddings(base_url: str, service_key: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    request_json(
        "POST",
        f"{base_url}/rest/v1/item_semantic_embeddings?on_conflict=item_id",
        service_key,
        prefer="resolution=merge-duplicates,return=minimal",
        data=json.dumps(rows),
    )


def fetch_events(base_url: str, service_key: str, limit: int = 10000) -> list[dict[str, Any]]:
    params = {
        "select": "visitor_id,item_id,event_type,dwell_ms,created_at",
        "limit": str(limit),
        "order": "created_at.desc",
    }
    data = request_json("GET", f"{base_url}/rest/v1/user_events", service_key, params=params)
    return data if isinstance(data, list) else []


def strength(event_type: str, dwell_ms: Any) -> float:
    if event_type == "interested":
        return 4.0
    if event_type == "not_interested":
        return -5.0
    if event_type == "open_source":
        return 2.0
    if event_type == "open_detail":
        return 1.0
    if event_type == "dwell":
        try:
            return min(2.0, max(0.0, float(dwell_ms or 0) / 30000.0))
        except (TypeError, ValueError):
            return 0.0
    return 0.0


def recency_multiplier(created_at: str | None) -> float:
    if not created_at:
        return 1.0
    try:
        from datetime import datetime, timezone

        timestamp = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        age_days = max(0.0, (datetime.now(timezone.utc) - timestamp).total_seconds() / 86400.0)
        return math.pow(0.5, age_days / 30.0)
    except Exception:
        return 1.0


def normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if not norm:
        return [0.0 for _ in vector]
    return [value / norm for value in vector]


def rebuild_profiles(
    base_url: str,
    service_key: str,
    vector_by_item: dict[str, list[float]],
) -> int:
    events = fetch_events(base_url, service_key)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        visitor = event.get("visitor_id")
        if isinstance(visitor, str):
            grouped[visitor].append(event)

    rows: list[dict[str, Any]] = []
    for visitor_id, visitor_events in grouped.items():
        aggregate = [0.0] * DIMENSIONS
        embedded_count = 0
        positive_count = 0
        negative_count = 0
        for event in visitor_events[:200]:
            vector = vector_by_item.get(str(event.get("item_id")))
            if vector is None:
                continue
            event_strength = strength(str(event.get("event_type")), event.get("dwell_ms"))
            if event_strength == 0:
                continue
            embedded_count += 1
            positive_count += int(event_strength > 0)
            negative_count += int(event_strength < 0)
            scale = event_strength * recency_multiplier(event.get("created_at"))
            for index, value in enumerate(vector):
                aggregate[index] += value * scale

        if embedded_count == 0:
            continue
        profile = normalize(aggregate)
        if not any(profile):
            continue
        rows.append(
            {
                "visitor_id": visitor_id,
                "model": MODEL_NAME,
                "dimensions": DIMENSIONS,
                "embedding": profile,
                "event_count": len(visitor_events[:200]),
                "positive_event_count": positive_count,
                "negative_event_count": negative_count,
            }
        )

    if rows:
        request_json(
            "POST",
            f"{base_url}/rest/v1/user_semantic_profiles?on_conflict=visitor_id",
            service_key,
            prefer="resolution=merge-duplicates,return=minimal",
            data=json.dumps(rows),
        )
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()

    env = load_env()
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "") or env.get("SUPABASE_SECRET_KEY", "")
    if not base_url or not service_key:
        raise SystemExit("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

    feed = fetch_feed(base_url, service_key, max(1, args.limit))
    if not feed:
        print(json.dumps({"status": "no-items"}, ensure_ascii=False))
        return

    print(f"[embedding] 加载模型 {MODEL_NAME} ...")
    model = SentenceTransformer(MODEL_NAME)
    texts = [content_text(row) for row in feed]
    started = time.time()
    embeddings = model.encode(
        texts,
        batch_size=max(1, args.batch_size),
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    upsert_rows: list[dict[str, Any]] = []
    vector_by_item: dict[str, list[float]] = {}
    for row, text, raw_vector in zip(feed, texts, embeddings):
        vector = [float(value) for value in raw_vector.tolist()]
        if len(vector) != DIMENSIONS:
            raise RuntimeError(f"模型维度异常：期望 {DIMENSIONS}，得到 {len(vector)}")
        item_id = str(row["item_id"])
        vector_by_item[item_id] = vector
        upsert_rows.append(
            {
                "item_id": item_id,
                "model": MODEL_NAME,
                "dimensions": DIMENSIONS,
                "content_hash": sha256(text),
                "embedding": vector,
            }
        )

    # PostgREST 单请求不要过大，分块写入。
    for start in range(0, len(upsert_rows), 50):
        upsert_embeddings(base_url, service_key, upsert_rows[start : start + 50])

    profiles = rebuild_profiles(base_url, service_key, vector_by_item)
    print(
        json.dumps(
            {
                "status": "success",
                "model": MODEL_NAME,
                "dimensions": DIMENSIONS,
                "items_embedded": len(upsert_rows),
                "user_profiles_rebuilt": profiles,
                "duration_seconds": round(time.time() - started, 2),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
