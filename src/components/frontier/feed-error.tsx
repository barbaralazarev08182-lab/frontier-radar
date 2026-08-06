import { AlertTriangle, ServerOff } from "lucide-react";

interface FeedErrorStateProps {
  /** unconfigured = 数据模式 supabase 但缺少环境变量；query = 数据库查询失败 */
  kind: "unconfigured" | "query";
  message: string;
  showDetails: boolean;
}

/** 数据层错误状态（Server Component）。生产环境不展示内部细节。 */
export function FeedErrorState({ kind, message, showDetails }: FeedErrorStateProps) {
  const isUnconfigured = kind === "unconfigured";
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-10 text-center">
      <div className="mx-auto mb-3 flex justify-center">
        {isUnconfigured ? (
          <ServerOff className="h-8 w-8 text-muted-foreground" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium">
        {isUnconfigured ? "Supabase 未配置" : "数据加载失败"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {isUnconfigured
          ? "当前数据模式为 supabase，但缺少数据库环境变量。请配置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY；开发环境可设置 FRONTIER_DATA_MODE=fixture 使用演示数据。"
          : "从数据库读取内容时出错，请稍后重试。"}
      </p>
      {showDetails && message ? (
        <p className="mx-auto mt-3 max-w-md break-all font-mono text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
