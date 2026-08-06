-- ============================================================================
-- Frontier Radar · 0005_raw_items_payload_history.sql
-- 阶段 1.2 修正：raw_items 需支持「相同 payload 不重复插入、变化则追加不可变
-- 新记录」的版本历史语义。原 0001 的 unique(source_id, source_item_id) 会阻止
-- 同一 source_item_id 的多条原始记录，改为 unique(source_id, source_item_id,
-- payload_hash)。
-- ============================================================================

alter table public.raw_items
  drop constraint if exists raw_items_source_id_source_item_id_key;

alter table public.raw_items
  add constraint raw_items_unique_payload
    unique (source_id, source_item_id, payload_hash);

create index if not exists idx_raw_items_source_item_hash
  on public.raw_items (source_id, source_item_id, payload_hash);
