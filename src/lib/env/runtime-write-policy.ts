/**
 * Runtime persistence boundary for Vercel deployments.
 *
 * Preview/development deployments are allowed to read the shared production
 * dataset for realistic QA, but they must not persist runtime state back into
 * that dataset. Local/non-Vercel workflows keep their historical behavior.
 */
type RuntimeWriteEnv = { VERCEL_ENV?: string };

export function canWriteRuntimeData(env: RuntimeWriteEnv = process.env): boolean {
  const vercelEnv = env.VERCEL_ENV;
  if (!vercelEnv) return true;
  return vercelEnv === "production";
}
