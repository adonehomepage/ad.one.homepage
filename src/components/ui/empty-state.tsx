export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div role="status" className="rounded-[16px] border border-dashed border-border bg-white px-8 py-20 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-text-body">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
