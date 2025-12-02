interface TopBarProps {
  activeProvider: string;
}

export function TopBar({ activeProvider }: TopBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/40 px-6 py-4 backdrop-blur-3xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Audiogen</p>
        <p className="text-lg font-semibold text-white">Prompt → Sound Design Lab</p>
        <p className="text-xs text-white/50">Cinematic sonic explorations with shader-driven ambience.</p>
      </div>
      <div className="text-right text-xs text-white/60">
        <p>Provider</p>
        <p className="font-semibold tracking-[0.3em] text-white/80">{activeProvider}</p>
      </div>
    </div>
  );
}
