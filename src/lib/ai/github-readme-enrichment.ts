/**
 * Targeted GitHub README enrichment for paid AI analysis.
 *
 * The production GitHub collector intentionally skips README enrichment to save
 * GitHub API quota. When a GitHub item has already passed the candidate gate and
 * is about to receive paid AI analysis, fetch at most one README for that item.
 *
 * This helper never calls an LLM. Fetch/persist failures are non-fatal and fall
 * back to the documents already available to the analyzer.
 */
import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisDocument, AnalysisItemRow } from "./types";
import { GitHubClient } from "@/lib/github/client";
import { computePayloadHash } from "@/lib/hash";
import { insertDocument } from "@/lib/db/repositories/item-documents";

export type GithubReadmeClient = Pick<GitHubClient, "getReadme">;

export interface GithubReadmeEnrichmentOptions {
  /** Maximum stored README bytes. The final model input is still capped separately. */
  maxBytes: number;
  /** Test injection. Production creates a GitHubClient from server env. */
  client?: GithubReadmeClient;
  token?: string;
}

function repoIdentity(item: AnalysisItemRow): { owner: string; repo: string } | null {
  const fullName = item.full_name?.trim();
  if (fullName) {
    const parts = fullName.split("/").filter(Boolean);
    if (parts.length === 2) {
      return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/i, "") };
    }
  }

  try {
    const url = new URL(item.source_url);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

function truncateUtf8(buf: Buffer, maxBytes: number): { text: string; truncated: boolean } {
  if (buf.length <= maxBytes) return { text: buf.toString("utf8"), truncated: false };

  let end = Math.max(0, maxBytes);
  while (end > 0) {
    const byte = buf[end];
    if (byte === undefined || (byte & 0xc0) !== 0x80) break;
    end--;
  }
  return { text: buf.subarray(0, end).toString("utf8"), truncated: true };
}

function defaultClient(token: string): GithubReadmeClient {
  return new GitHubClient({
    baseUrl: process.env.GITHUB_API_BASE_URL ?? "https://api.github.com",
    apiVersion: process.env.GITHUB_API_VERSION ?? "2026-03-10",
    token,
    timeoutMs: Number(process.env.GITHUB_REQUEST_TIMEOUT_MS) || 10_000,
    maxRetries: Number(process.env.GITHUB_MAX_RETRIES) || 1,
  });
}

/**
 * Return the original documents unless all of these are true:
 * - item is GitHub;
 * - no usable README is already stored;
 * - a GitHub token/client is available;
 * - README fetch succeeds.
 *
 * A fetched README is prepended so prepareAnalysisInput() uses it for GitHub.
 */
export async function enrichGithubReadmeForAnalysis(
  supabase: SupabaseClient,
  item: AnalysisItemRow,
  documents: AnalysisDocument[],
  opts: GithubReadmeEnrichmentOptions
): Promise<AnalysisDocument[]> {
  if (item.source_slug !== "github") return documents;
  if (documents.some((doc) => doc.document_type === "readme" && doc.content_text?.trim())) {
    return documents;
  }

  const identity = repoIdentity(item);
  if (!identity) return documents;

  const token = opts.token ?? process.env.GITHUB_TOKEN;
  const client = opts.client ?? (token ? defaultClient(token) : null);
  if (!client) return documents;

  try {
    const response = await client.getReadme(identity.owner, identity.repo);
    if (response.notFound || response.notModified) return documents;
    if (response.data.encoding !== "base64" || !response.data.content) return documents;

    const raw = Buffer.from(response.data.content.replace(/\s+/g, ""), "base64");
    const maxBytes = Math.max(1_024, Math.floor(opts.maxBytes));
    const decoded = truncateUtf8(raw, maxBytes);
    if (!decoded.text.trim()) return documents;

    const storedBytes = Buffer.byteLength(decoded.text, "utf8");
    const readme: AnalysisDocument = {
      document_type: "readme",
      content_text: decoded.text,
      source_revision: response.data.sha || null,
    };

    await insertDocument(supabase, {
      item_id: item.id,
      document_type: "readme",
      source_url: response.data.html_url || item.source_url,
      source_revision: response.data.sha || null,
      content_text: decoded.text,
      content_hash: computePayloadHash(decoded.text),
      etag: response.etag,
      last_modified: response.lastModified,
      original_size: raw.length,
      stored_size: storedBytes,
      is_truncated: decoded.truncated,
      encoding: "utf-8",
      metadata: { enrichment: "ai-targeted" },
    }).catch(() => {});

    return [readme, ...documents.filter((doc) => doc.document_type !== "readme")];
  } catch {
    return documents;
  }
}
