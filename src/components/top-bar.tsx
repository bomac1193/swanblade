interface TopBarProps {
  activeProvider: string;
}

export function TopBar({ activeProvider }: TopBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-brand-border bg-brand-surface px-6 py-4">
      <div>
        <p className="text-label uppercase tracking-wider text-brand-secondary">Swanblade</p>
        <p className="text-heading-lg text-brand-text">Sound Design Lab</p>
        <p className="text-body-sm text-brand-secondary">Prompt-driven audio generation with game-state awareness.</p>
      </div>
      <div className="text-right">
        <p className="text-label uppercase tracking-wider text-brand-secondary">Provider</p>
        <p className="text-body font-medium text-brand-text">{activeProvider}</p>
      </div>
    </div>
  );
}
