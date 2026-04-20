export default function Panel({ title, eyebrow, actions, children, className = '', delay = 0 }) {
  return (
    <section
      className={`card rise-in p-5 sm:p-6 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {(title || eyebrow || actions) && (
        <header className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-[color:var(--color-rule-soft)]">
          <div>
            {eyebrow && <p className="kicker mb-1.5">{eyebrow}</p>}
            {title && (
              <h3 className="font-display text-[19px] font-semibold tracking-tight text-[color:var(--color-ink)]">
                {title}
              </h3>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
