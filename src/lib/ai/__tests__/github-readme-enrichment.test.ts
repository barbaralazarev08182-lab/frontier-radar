import { Buffer } from "node:buffer";
import { test } from "node:test";
import assert from "node:assert/strict";
import { enrichGithubReadmeForAnalysis, type GithubReadmeClient } from "@/lib/ai/github-readme-enrichment";
import type { AnalysisDocument, AnalysisItemRow } from "@/lib/ai/types";

function item(source = "github"): AnalysisItemRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source_slug: source,
    source_item_id: "123",
    item_type: source === "github" ? "repo" : "product",
    title: "Example",
    description: "Example project",
    owner: "octocat",
    full_name: source === "github" ? "octocat/example" : null,
    language: "TypeScript",
    license: "MIT",
    source_url: source === "github" ? "https://github.com/octocat/example" : "https://example.com",
    topics: ["agent"],
    created_at_source: "2026-08-19T00:00:00Z",
    pushed_at_source: "2026-08-19T00:00:00Z",
    first_seen_at: "2026-08-19T00:00:00Z",
    last_updated_at: "2026-08-19T00:00:00Z",
  };
}

function mockSupabase(onUpsert?: (payload: Record<string, unknown>) => void) {
  return {
    from: () => ({
      upsert: async (payload: Record<string, unknown>) => {
        onUpsert?.(payload);
        return { error: null, status: 201 };
      },
    }),
  } as never;
}

test("non-GitHub items never fetch README", async () => {
  let calls = 0;
  const client: GithubReadmeClient = {
    getReadme: async () => {
      calls++;
      throw new Error("should not be called");
    },
  };
  const docs: AnalysisDocument[] = [];
  const result = await enrichGithubReadmeForAnalysis(mockSupabase(), item("hackernews"), docs, {
    maxBytes: 12_000,
    client,
  });

  assert.equal(calls, 0);
  assert.equal(result, docs);
});

test("existing stored README is reused without another GitHub request", async () => {
  let calls = 0;
  const client: GithubReadmeClient = {
    getReadme: async () => {
      calls++;
      throw new Error("should not be called");
    },
  };
  const docs: AnalysisDocument[] = [
    { document_type: "readme", content_text: "already stored", source_revision: "abc" },
  ];
  const result = await enrichGithubReadmeForAnalysis(mockSupabase(), item(), docs, {
    maxBytes: 12_000,
    client,
  });

  assert.equal(calls, 0);
  assert.equal(result, docs);
});

test("selected GitHub item fetches, caps, persists and returns README before paid analysis", async () => {
  const original = "A".repeat(3_000);
  let calls = 0;
  let persisted: Record<string, unknown> = {};
  const client: GithubReadmeClient = {
    getReadme: async (owner, repo) => {
      calls++;
      assert.equal(owner, "octocat");
      assert.equal(repo, "example");
      return {
        data: {
          name: "README.md",
          path: "README.md",
          sha: "readme-sha",
          size: original.length,
          url: "https://api.github.com/repos/octocat/example/readme",
          html_url: "https://github.com/octocat/example/blob/main/README.md",
          git_url: "https://api.github.com/repos/octocat/example/git/blobs/readme-sha",
          download_url: null,
          type: "file",
          content: Buffer.from(original, "utf8").toString("base64"),
          encoding: "base64",
        },
        status: 200,
        rateLimit: null,
        etag: "etag-1",
        lastModified: null,
        notModified: false,
      };
    },
  };

  const result = await enrichGithubReadmeForAnalysis(
    mockSupabase((payload) => {
      persisted = payload;
    }),
    item(),
    [],
    { maxBytes: 2_000, client }
  );

  assert.equal(calls, 1);
  assert.equal(result[0]?.document_type, "readme");
  assert.equal(result[0]?.content_text?.length, 2_000);
  assert.equal(result[0]?.source_revision, "readme-sha");
  assert.equal(persisted.document_type, "readme");
  assert.equal(persisted.is_truncated, true);
  assert.equal(persisted.original_size, 3_000);
  assert.equal(persisted.stored_size, 2_000);
});
