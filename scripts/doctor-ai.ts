/**
 * AI Provider 诊断脚本（阶段 1.5）。
 *
 * 用法：npm run doctor:ai
 *
 * 检查项：
 *   - AI_PROVIDER / AI_BASE_URL / AI_API_KEY / AI_MODEL 是否存在
 *   - timeout / batch size / concurrency / max input chars 等配置
 *   - TokenHub API 可访问性（GET {baseUrl}/models）
 *   - 配置模型是否在模型列表中
 *
 * 禁止输出：API Key、Key 长度、Authorization Header、完整模型输入。
 * 模型列表端点不可用时，明确区分「列表端点不支持」与「服务不可达」，不直接断言整个服务不可用。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const f of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (env[t.slice(0, eq).trim()] === undefined) env[t.slice(0, eq).trim()] = v;
    }
  }
  return env;
}

function checkPresent(key: string, env: Record<string, string>) {
  const value = env[key];
  return { key, present: !!value && value.length > 0, label: value ? "已配置" : "未配置（缺失）" };
}

/** GET {baseUrl}/models，返回状态分类，绝不回传响应体/Token。 */
async function checkModelsEndpoint(baseUrl: string, apiKey: string, configuredModel: string): Promise<{
  reachable: boolean;
  status?: number;
  authOk?: boolean;
  listSupported?: boolean;
  modelPresent?: boolean;
  modelCount?: number;
  error?: string;
}> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 200) {
      let modelIds: string[] = [];
      try {
        const data = (await res.json()) as { data?: Array<{ id?: string }> };
        modelIds = Array.isArray(data.data) ? data.data.map((m) => m.id ?? "").filter(Boolean) : [];
      } catch {
        // 响应不是 JSON：列表不可解析，但服务可达
      }
      const normalized = modelIds.map((id) => id.replace(/^\//, ""));
      const modelPresent =
        modelIds.includes(configuredModel) ||
        modelIds.includes(`/${configuredModel}`) ||
        normalized.includes(configuredModel);
      return { reachable: true, status: 200, authOk: true, listSupported: true, modelCount: modelIds.length, modelPresent };
    }
    if (res.status === 401 || res.status === 403) {
      return { reachable: true, status: res.status, authOk: false, listSupported: false, error: `鉴权失败（${res.status}）` };
    }
    if (res.status === 404 || res.status === 405) {
      // 列表端点不支持，但 Chat Completions 仍可能可用
      return { reachable: true, status: res.status, listSupported: false, error: `模型列表端点不可用（${res.status}），Chat Completions 仍可能可用` };
    }
    return { reachable: true, status: res.status, listSupported: false, error: `模型列表端点返回 ${res.status}` };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError") return { reachable: false, error: "请求超时" };
    return { reachable: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const env = loadEnv();
  const { ANALYSIS_PROMPT_VERSION, ANALYSIS_SCHEMA_VERSION } = await import("@/lib/ai/schema");

  const baseUrl = env.AI_BASE_URL ?? "";
  const apiKey = env.AI_API_KEY ?? "";
  const model = env.AI_MODEL ?? "";

  const results = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  results.checks["ai_provider"] = { value: env.AI_PROVIDER ?? "tencent（默认）" };
  results.checks["ai_base_url"] = { value: baseUrl ? `${baseUrl}` : "未配置（缺失）" };
  results.checks["ai_api_key"] = checkPresent("AI_API_KEY", env);
  results.checks["ai_model"] = checkPresent("AI_MODEL", env);

  results.checks["ai_config"] = {
    timeout_ms: Number(env.AI_REQUEST_TIMEOUT_MS) || 60_000,
    max_retries: Number(env.AI_MAX_RETRIES) || 2,
    batch_size: Number(env.AI_ANALYSIS_BATCH_SIZE) || 10,
    concurrency: Number(env.AI_ANALYSIS_CONCURRENCY) || 1,
    max_input_chars: Number(env.AI_MAX_INPUT_CHARS) || 12_000,
    temperature: Number(env.AI_TEMPERATURE) || 0.2,
    prompt_version: ANALYSIS_PROMPT_VERSION,
    schema_version: ANALYSIS_SCHEMA_VERSION,
  };

  // TokenHub API 检查
  if (baseUrl && apiKey) {
    const api = await checkModelsEndpoint(baseUrl, apiKey, model);
    results.checks["tokenhub_api"] = api;
    if (api.listSupported && api.modelCount && api.modelCount > 0 && api.modelPresent === false) {
      results.checks["configured_model"] = {
        present: false,
        note: `AI_MODEL=${model || "（未配置）"} 不在模型列表中（可能是别名，Chat Completions 仍可尝试）`,
      };
    } else {
      results.checks["configured_model"] = {
        present: api.modelPresent ?? null,
        note: api.listSupported ? (api.modelPresent ? "模型在列表中" : "无法判断（列表为空或不可解析）") : "模型列表端点不可用，无法比对",
      };
    }
  } else {
    results.checks["tokenhub_api"] = {
      reachable: null,
      note: "未配置 AI_BASE_URL 或 AI_API_KEY，跳过 API 可达性检查",
    };
    results.checks["configured_model"] = { present: null, note: "未配置，跳过" };
  }

  process.stdout.write(JSON.stringify(results, null, 2) + "\n");

  // 退出码：网络不可达 → 2；鉴权失败 → 1；其余 0（列表端点不支持不视为服务不可用）
  const api = results.checks["tokenhub_api"] as { reachable?: boolean | null; authOk?: boolean };
  if (api.reachable === false) process.exitCode = 2;
  else if (api.reachable === true && api.authOk === false) process.exitCode = 1;
  else process.exitCode = 0;
}

main().catch((err) => {
  process.stderr.write(`[doctor:ai] 错误：${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
