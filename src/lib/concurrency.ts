/**
 * 受限并发执行器（阶段 1.2）。
 *
 * 默认串行（limit=1）；确有必要时并发上限不得超过 2，且必须有集中队列控制，
 * 避免对 GitHub 产生大量并发请求触发限流。
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const effectiveLimit = Math.max(1, Math.min(limit, 2));
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function pump(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]!, index);
    }
  }

  const pools = Array.from({ length: effectiveLimit }, () => pump());
  await Promise.all(pools);
  return results;
}
