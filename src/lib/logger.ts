/**
 * 结构化日志器（阶段 1.2）。
 *
 * 安全约束（全工程强制）：
 *  - 日志允许字段：run_id / query_id / method / path / status / duration_ms /
 *    retry_count / remaining / reset_at / 计数等。
 *  - 日志禁止字段：Authorization Header / Token / 完整响应 payload /
 *    Supabase secret / AI api key / 用户个人数据。
 * 调用方有责任不把敏感值作为字段传入。本 logger 不做自动脱敏，
 * 仅在 debug 以下不输出 payload。
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export interface ConsoleLoggerOptions {
  level?: LogLevel;
  /** 输出流，默认 process.stderr（避免与 stdout 的汇总混在一起） */
  sink?: (line: string) => void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(opts: ConsoleLoggerOptions = {}): Logger {
  const level = opts.level ?? "info";
  const sink = opts.sink ?? ((line: string) => process.stderr.write(line + "\n"));
  const enabled = (l: LogLevel) => LEVEL_ORDER[l] >= LEVEL_ORDER[level];

  const emit = (lvl: LogLevel, event: string, fields?: LogFields) => {
    if (!enabled(lvl)) return;
    const entry = {
      ts: new Date().toISOString(),
      level: lvl,
      event,
      ...(fields ?? {}),
    };
    sink(JSON.stringify(entry));
  };

  return {
    debug: (event, fields) => emit("debug", event, fields),
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
}

/** 默认 logger 实例（info 级别，输出到 stderr）。 */
export const defaultLogger: Logger = createLogger();
