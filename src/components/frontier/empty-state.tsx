interface EmptyStateProps {
  title: string;
  description: string;
  hint?: string | null;
}

/** 空状态（Server Component）：说明原因并给出可操作提示。 */
export function EmptyState({ title, description, hint }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {hint ? (
        <p className="mx-auto mt-2 max-w-md font-mono text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
