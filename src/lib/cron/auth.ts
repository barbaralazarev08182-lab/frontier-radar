/**
 * Cron 鉴权（阶段 1.7）。
 *
 * 规则：
 *  - 使用 Authorization: Bearer <CRON_SECRET>；
 *  - CRON_SECRET 缺失时拒绝运行（500，服务端配置错误）；
 *  - 不接受 query parameter 中的密钥；
 *  - 不接受空密钥；
 *  - 鉴权失败返回 401，响应不泄露期望密钥；
 *  - 生产环境无免鉴权绕过。
 */
import { timingSafeEqual } from "node:crypto";

export interface CronAuthResult {
  authorized: boolean;
  /** authorized=false 时携带可直接返回的响应 */
  response?: Response;
}

/** 检查请求是否携带正确 Cron 密钥。 */
export function checkCronAuth(request: Request, secret?: string): CronAuthResult {
  const cronSecret = secret ?? process.env.CRON_SECRET;
  if (!cronSecret) {
    return {
      authorized: false,
      response: Response.json(
        { error: "cron_secret_not_configured", message: "CRON_SECRET 未配置，任务已拒绝运行。" },
        { status: 500 }
      ),
    };
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return {
      authorized: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return {
      authorized: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  // 恒定时间比较，避免时序侧信道；不泄露期望密钥
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(cronSecret, "utf8");
  const matched = a.length === b.length && timingSafeEqual(a, b);
  if (!matched) {
    return {
      authorized: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { authorized: true };
}
