/**
 * Supabase 新旧密钥选择优先级测试（阶段 1.7）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePublishableKey,
  resolveSecretKey,
  isSupabaseReadConfigured,
} from "@/lib/env/supabase-keys";

function withEnv(patch: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(patch)) {
    saved[k] = process.env[k];
    if (patch[k] === undefined) delete process.env[k];
    else process.env[k] = patch[k];
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("Supabase 新旧密钥选择：新变量优先，缺失回退旧变量", () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-new",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-old",
      SUPABASE_SECRET_KEY: "secret-new",
      SUPABASE_SERVICE_ROLE_KEY: "sr-old",
    },
    () => {
      assert.equal(resolvePublishableKey(), "pub-new");
      assert.equal(resolveSecretKey(), "secret-new");
    }
  );

  // 新变量缺失 → 回退旧变量
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-old",
      SUPABASE_SECRET_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: "sr-old",
    },
    () => {
      assert.equal(resolvePublishableKey(), "anon-old");
      assert.equal(resolveSecretKey(), "sr-old");
    }
  );

  // 全部缺失 → undefined；只读配置需要 URL + 公开 Key
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SECRET_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    () => {
      assert.equal(resolvePublishableKey(), undefined);
      assert.equal(resolveSecretKey(), undefined);
      assert.equal(isSupabaseReadConfigured(), false);
    }
  );
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub",
      SUPABASE_SECRET_KEY: "secret",
    },
    () => {
      assert.equal(isSupabaseReadConfigured(), true);
    }
  );
});
