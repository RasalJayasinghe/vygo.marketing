export default function SectionHeading({ number, title, caption }) {
  return (
    <div className="rise-in flex items-end justify-between gap-4 pt-2 pb-3 border-b border-[color:var(--color-ink)]">
      <div className="flex items-baseline gap-4 min-w-0">
        {number && <span className="section-no shrink-0">{number}</span>}
        <h2 className="display-heading text-[24px] sm:text-[30px] text-[color:var(--color-ink)] truncate">
          {title}
        </h2>
      </div>
      {caption && (
        <p className="hidden md:block text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-mute)] shrink-0 font-medium">
          {caption}
        </p>
      )}
    </div>
  )
}
