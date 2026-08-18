import { useMemo, useState } from 'react'
import { Check, ClipboardCopy, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { cn } from '@/lib/utils'

// Every SKILL.md under .cursor/skills is both an agent skill (Cursor/Claude
// pick it up automatically from that folder) and, via this page, a
// copy-pasteable playbook for the team. One source of truth, two audiences.
const skillFiles = import.meta.glob('../../.cursor/skills/*/SKILL.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function parseSkill(path, raw) {
  const id = path.split('/').at(-2)
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { id, name: id, description: '', body: raw.trim() }
  const [, frontmatter, body] = match
  const name = frontmatter.match(/^name:\s*(.*)$/m)?.[1]?.trim() || id
  const description = frontmatter.match(/^description:\s*(.*)$/m)?.[1]?.trim() || ''
  return { id, name, description, body: body.trim(), raw }
}

const SKILLS = Object.entries(skillFiles)
  .map(([path, raw]) => parseSkill(path, raw))
  .sort((a, b) => a.name.localeCompare(b.name))

export default function Skills() {
  const [selectedId, setSelectedId] = useState(SKILLS[0]?.id)
  const selected = useMemo(() => SKILLS.find(s => s.id === selectedId) || SKILLS[0], [selectedId])
  const [copied, setCopied] = useState(false)

  function copy(text) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!selected) {
    return <p className="text-sm text-muted-foreground">No skills found in .cursor/skills yet.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {SKILLS.map(skill => (
          <button
            key={skill.id}
            type="button"
            onClick={() => setSelectedId(skill.id)}
            className={cn(
              'block w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
              skill.id === selected.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-white hover:bg-muted'
            )}
          >
            <p className={cn('text-[13px] font-medium', skill.id === selected.id ? 'text-primary' : 'text-foreground')}>
              {skill.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
              {skill.description}
            </p>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-foreground">{selected.name}</h2>
              <Badge variant="brand">Skill</Badge>
            </div>
            <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{selected.description}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => copy(selected.raw)}>
            {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy skill'}
          </Button>
        </div>

        <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-[12px] text-muted-foreground">
          <FolderOpen className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Lives at <code className="rounded bg-white px-1 py-0.5 text-[11px]">.cursor/skills/{selected.id}/SKILL.md</code>.
            Cursor and Claude pick it up automatically in this repo, so anyone drafting here gets the same voice without
            being asked. Use the button above to copy it into another project's skills folder, or copy the playbook below
            straight into an email or doc.
          </span>
        </div>

        <Card>
          <CardContent className="max-h-[min(65vh,720px)] overflow-y-auto scroll-slim p-4">
            <pre className="select-text whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted-foreground">
              {selected.body}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
