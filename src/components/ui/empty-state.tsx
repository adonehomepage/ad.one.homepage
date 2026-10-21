export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div role="status" className="rounded-[16px] border border-border bg-white px-6 py-10 text-center">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
