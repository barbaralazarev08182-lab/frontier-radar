/**
 * HuggingFace Hub 采集器最小测试（阶段 1.3）。
 *
 * 覆盖：标准化 / source_item_id 不冲突 / Card document_type / dry-run
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeModel,
  normalizeDataset,
  normalizeSpace,
  normalizeHFItem,
  normalizeHFTags,
} from "@/lib/collectors/huggingface/normalize";
import { CARD_DOCUMENT_TYPES } from "@/lib/collectors/huggingface/enrich";
import type { HFModel, HFDataset, HFSpace } from "@/lib/huggingface/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_MODEL: HFModel = {
  _id: "abc123",
  id: "meta-llama/Llama-3-8B",
  modelId: "meta-llama/Llama-3-8B",
  author: "meta-llama",
  sha: "sha256:abc123",
  pipeline_tag: "text-generation",
  library_name: "transformers",
  tags: ["pytorch", "transformers", "text-generation", "license:apache-2.0", "arxiv:2307.09288"],
  downloads: 15_000_000,
  likes: 12_345,
  private: false,
  gated: false,
  lastModified: "2026-07-15T10:30:00.000Z",
  createdAt: "2024-04-01T08:00:00.000Z",
};

const SAMPLE_DATASET: HFDataset = {
  _id: "def456",
  id: "mozilla-foundation/common_voice_13_0",
  author: "mozilla-foundation",
  sha: "sha256:def456",
  tags: ["audio", "automatic-speech-recognition", "modality:audio", "language:en", "license:cc-by-4.0"],
  downloads: 5_500_000,
  likes: 3_210,
  private: false,
  gated: false,
  lastModified: "2026-06-20T14:00:00.000Z",
  description: "A massively-multilingual speech corpus.",
  createdAt: "2025-01-10T12:00:00.000Z",
};

const SAMPLE_SPACE: HFSpace = {
  _id: "ghi789",
  id: "stabilityai/stable-diffusion-online",
  author: "stabilityai",
  sdk: "gradio",
  tags: ["gradio", "image-generation", "modality:image"],
  likes: 8_900,
  private: false,
  createdAt: "2025-06-01T09:00:00.000Z",
  runtime_stage: "running",
  hardware: { cpu: 2, memory: "16Gi" },
};

// ===========================================================================
// 1. Model 标准化
// ===========================================================================

test("normalizeModel 正确映射所有字段", () => {
  const n = normalizeModel(SAMPLE_MODEL);

  // source_item_id 含类型前缀
  assert.equal(n.sourceItemId, "model:meta-llama/Llama-3-8B");
  assert.ok(n.dedupeKey.startsWith("huggingface:"));
  assert.equal(n.contentType, "model");
  assert.equal(n.itemType, "model");

  // 基本信息
  assert.equal(n.title, "Llama-3-8B");
  assert.equal(n.canonicalUrl, "https://huggingface.co/meta-llama/Llama-3-8B");
  assert.equal(n.author, "meta-llama");
  assert.equal(n.fullName, "meta-llama/Llama-3-8B");

  // 指标
  assert.equal(n.downloads, 15_000_000);
  assert.equal(n.likes, 12_345);

  // 特有字段
  assert.equal(n.pipelineTag, "text-generation");
  assert.equal(n.libraryName, "transformers");
  assert.equal(n.private, false);
  assert.equal(n.gated, false);

  // Tags 已规范化
  assert.ok(Array.isArray(n.tags));
  assert.ok(n.tags.length > 0);
  assert.ok(n.tags.every((t) => t === t.toLowerCase()));

  // 时间戳
  assert.equal(n.createdAt, "2024-04-01T08:00:00.000Z");
  assert.equal(n.updatedAt, "2026-07-15T10:30:00.000Z");

  // payload
  assert.ok(n.rawPayload);
  assert.ok(typeof n.payloadHash === "string" && n.payloadHash.length > 0);
});

// ===========================================================================
// 2. Dataset 标准化
// ===========================================================================

test("normalizeDataset 正确映射所有字段", () => {
  const n = normalizeDataset(SAMPLE_DATASET);

  assert.equal(n.sourceItemId, "dataset:mozilla-foundation/common_voice_13_0");
  assert.equal(n.contentType, "dataset");
  assert.equal(n.itemType, "dataset");
  assert.equal(n.title, "common_voice_13_0");
  assert.equal(n.canonicalUrl, "https://huggingface.co/datasets/mozilla-foundation/common_voice_13_0");
  assert.equal(n.author, "mozilla-foundation");
  assert.equal(n.description, "A massively-multilingual speech corpus.");
  assert.equal(n.downloads, 5_500_000);
  assert.equal(n.likes, 3_210);
  assert.equal(n.private, false);
  assert.equal(n.gated, false);
});

// ===========================================================================
// 3. Space 标准化
// ===========================================================================

test("normalizeSpace 正确映射所有字段", () => {
  const n = normalizeSpace(SAMPLE_SPACE);

  assert.equal(n.sourceItemId, "space:stabilityai/stable-diffusion-online");
  assert.equal(n.contentType, "space");
  assert.equal(n.itemType, "space");
  assert.equal(n.title, "stable-diffusion-online");
  assert.equal(n.canonicalUrl, "https://huggingface.co/spaces/stabilityai/stable-diffusion-online");
  assert.equal(n.author, "stabilityai");
  assert.equal(n.sdk, "gradio");
  assert.equal(n.likes, 8_900);
  assert.equal(n.downloads, null); // Spaces 无 downloads
  assert.equal(n.private, false);
});

// ===========================================================================
// 4. 三种类型相同 repo ID 不冲突
// ===========================================================================

test("相同 repo ID 在不同类型中产生不同的 source_item_id", () => {
  // 假设三个内容有相同的 owner/name 部分
  const model = normalizeModel({ ...SAMPLE_MODEL, id: "org/same-name", modelId: "org/same-name" });
  const dataset = normalizeDataset({ ...SAMPLE_DATASET, id: "org/same-name" });
  const space = normalizeSpace({ ...SAMPLE_SPACE, id: "org/same-name" });

  assert.notEqual(model.sourceItemId, dataset.sourceItemId);
  assert.notEqual(dataset.sourceItemId, space.sourceItemId);
  assert.notEqual(model.sourceItemId, space.sourceItemId);

  // 验证前缀
  assert.ok(model.sourceItemId.startsWith("model:"));
  assert.ok(dataset.sourceItemId.startsWith("dataset:"));
  assert.ok(space.sourceItemId.startsWith("space:"));

  // 去重键也不同
  assert.notEqual(model.dedupeKey, dataset.dedupeKey);
});

// ===========================================================================
// 5. Card document_type 映射正确
// ===========================================================================

test("CARD_DOCUMENT_TYPES 映射三种类型到正确的 document_type", () => {
  assert.equal(CARD_DOCUMENT_TYPES.model, "model_card");
  assert.equal(CARD_DOCUMENT_TYPES.dataset, "dataset_card");
  assert.equal(CARD_DOCUMENT_TYPES.space, "space_readme");
});

// ===========================================================================
// 6. normalizeHFItem 统一入口分发到正确的标准化函数
// ===========================================================================

test("normalizeHFItem 根据 contentType 分发到正确的标准化函数", () => {
  const modelNorm = normalizeHFItem("model", SAMPLE_MODEL);
  const datasetNorm = normalizeHFItem("dataset", SAMPLE_DATASET);
  const spaceNorm = normalizeHFItem("space", SAMPLE_SPACE);

  assert.equal(modelNorm.contentType, "model");
  assert.equal(modelNorm.pipelineTag, "text-generation");

  assert.equal(datasetNorm.contentType, "dataset");
  assert.equal(datasetNorm.description, "A massively-multilingual speech corpus.");

  assert.equal(spaceNorm.contentType, "space");
  assert.equal(spaceNorm.sdk, "gradio");
});

// ===========================================================================
// 7. normalizeHFTags 规范化行为
// ===========================================================================

test("normalizeHFTags 小写、去重、去空", () => {
  // 非字符串元素（如 null）直接丢弃，禁止 String(null) → "null"
  const tags = normalizeHFTags(["PyTorch", "Transformers", "", "pytorch", "  NLP  ", "nlp", null as never]);
  assert.deepEqual(tags, ["pytorch", "transformers", "nlp"]);
});

test("normalizeHFTags 处理空数组和 undefined", () => {
  assert.deepEqual(normalizeHFTags([]), []);
  assert.deepEqual(normalizeHFTags(undefined), []);
});

// ===========================================================================
// 8. null 标准化：API 的 null/undefined 不得变成 "null"/"undefined" 字符串
// ===========================================================================

test("可空字段原始值为 null / undefined / 空白时保持真正的 null", () => {
  const model = normalizeModel({
    ...SAMPLE_MODEL,
    author: null as never,
    sha: undefined as never,
    pipeline_tag: null as never,
    library_name: "   ",
  });
  assert.equal(model.author, null);
  assert.equal(model.sha, null);
  assert.equal(model.pipelineTag, null);
  assert.equal(model.libraryName, null);
  // 禁止字符串化
  assert.notEqual(model.author, "null");
  assert.notEqual(model.sha, "undefined");

  const dataset = normalizeDataset({
    ...SAMPLE_DATASET,
    author: undefined as never,
    description: null as never,
    sha: undefined as never,
  });
  assert.equal(dataset.author, null);
  assert.equal(dataset.description, null);
  assert.equal(dataset.sha, null);

  const space = normalizeSpace({
    ...SAMPLE_SPACE,
    author: null as never,
    sdk: undefined as never,
    runtime_stage: null as never,
    hardware: undefined as never,
  });
  assert.equal(space.author, null);
  assert.equal(space.sdk, null);
  assert.equal(space.runtimeStage, null);
  assert.equal(space.hardware, null);
});

test("space 的 hardware 对象原样保留、空时保持 null（不 String() 对象）", () => {
  const withHardware = normalizeSpace({ ...SAMPLE_SPACE, hardware: { cpu: 4, memory: "32Gi" } });
  assert.deepEqual(withHardware.hardware, { cpu: 4, memory: "32Gi" });

  const empty = normalizeSpace({ ...SAMPLE_SPACE, hardware: null as never });
  assert.equal(empty.hardware, null);
});

test("normalizeModel 保留 sha 供 Card revision 使用", () => {
  const n = normalizeModel(SAMPLE_MODEL);
  assert.equal(n.sha, "sha256:abc123");
});
