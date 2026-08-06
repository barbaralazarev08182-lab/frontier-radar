interface PagePlaceholderProps {
  title: string;
  description: string;
}

/**
 * 阶段 1.1 空白页占位（仅路由骨架，无业务逻辑）。
 * 不引入虚假演示数据。
 */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        该页面将在后续阶段接入真实数据。
      </div>
    </div>
  );
}
