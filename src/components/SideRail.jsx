export default function SideRail({ tabs, current, onChange }) {
  return (
    <aside className="relative z-10 hidden lg:flex flex-col w-[240px] shrink-0 h-full px-8 py-8 border-r border-[color:var(--color-rule)]">
      <div>
        <p className="kicker">Vygometrics</p>
        <h2 className="mt-2 display-heading text-[30px] text-[color:var(--color-ink)]">
          Marketing
          <br />
          <span className="serif-italic font-medium text-[color:var(--color-ink-soft)]">Journal</span>
        </h2>
      </div>

      <div className="rule mt-8 mb-6" />

      <nav className="flex flex-col gap-1">
        {tabs.map((t, i) => {
          const isActive = current === t.id
          const num = String(i + 1).padStart(2, '0')
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="group text-left py-3 relative flex items-baseline gap-4"
            >
              <span
                className="section-no transition-colors"
                style={{ color: isActive ? 'var(--color-violet-500)' : 'var(--color-ink-faint)' }}
              >
                {num}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className={`block text-[15px] leading-tight transition-colors ${
                    isActive
                      ? 'text-[color:var(--color-ink)] font-semibold'
                      : 'text-[color:var(--color-ink-soft)] font-medium group-hover:text-[color:var(--color-ink)]'
                  }`}
                >
                  {t.label}
                </span>
                {t.count !== undefined && (
                  <span className="block mt-0.5 text-[10px] tabular-nums uppercase tracking-[0.12em] text-[color:var(--color-ink-faint)]">
                    {t.count} {t.count === 1 ? 'entry' : 'entries'}
                  </span>
                )}
              </span>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[18px] h-px"
                  style={{ background: 'var(--color-ink)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-[color:var(--color-rule)]">
        <p className="kicker mb-2">Source</p>
        <p className="text-[11px] leading-relaxed text-[color:var(--color-ink-mute)]">
          Live-synced from the Vygo Master Sheet. Auto-refresh every 60 seconds.
        </p>
      </div>
    </aside>
  )
}
