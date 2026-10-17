import { useEffect, useRef, useState } from 'react'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { GraphNode, SearchResult } from '@/types'

type Props = {
  open: boolean
  nodes: GraphNode[]
  onClose: () => void
  onSelect: (id: number) => void
}

function localSearch(nodes: GraphNode[], query: string, limit: number): SearchResult[] {
  const q = query.toLowerCase()
  const scored: SearchResult[] = []
  for (const node of nodes) {
    const text = node.content.toLowerCase()
    const idx = text.indexOf(q)
    if (idx === -1) continue
    scored.push({ id: node.id, content: node.content, score: 1 / (1 + idx) })
  }
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return scored.slice(0, limit)
}

export function CommandPalette({ open, nodes, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [active, setActive] = useState(0)
  const [useBackend, setUseBackend] = useState(true)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q === '') {
      setResults([])
      setActive(0)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(async () => {
      let next: SearchResult[] | null = null
      if (useBackend) {
        try {
          next = await api.searchNodes(q)
        } catch {
          setUseBackend(false)
        }
      }
      if (next === null) next = localSearch(nodes, q, 20)
      if (cancelled) return
      setResults(next)
      setActive(0)
      setLoading(false)
    }, 120)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, open, nodes, useBackend])

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, results])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const result = results[active]
        if (result) {
          onSelect(result.id)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, active, onSelect, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[14vh]"
      onPointerDown={onClose}
    >
      <div
        className="popover-panel w-full max-w-lg border border-line bg-surface"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <span className="text-accent">❯</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="w-full bg-transparent text-fg outline-none placeholder:text-muted"
          />
          {loading && <span className="text-xs text-muted">…</span>}
        </div>

        <ul ref={listRef} className="max-h-80 overflow-auto py-1">
          {results.map((result, i) => (
            <li key={result.id}>
              <button
                type="button"
                data-active={i === active}
                onPointerDown={(e) => {
                  e.preventDefault()
                  onSelect(result.id)
                  onClose()
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                  i === active ? 'bg-elevated text-accent' : 'text-fg',
                )}
              >
                <span className="truncate">
                  {result.content || <span className="text-muted">empty</span>}
                </span>
              </button>
            </li>
          ))}
          {query.trim() === '' && (
            <li className="px-3 py-2 text-sm text-muted">Type to search your nodes…</li>
          )}
          {query.trim() !== '' && !loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">no matches</li>
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-line px-3 py-1.5 text-[10px] text-muted">
          <span>↑↓ navigate</span>
          <span>enter jump</span>
          <span>esc close</span>
          {!useBackend && <span className="ml-auto text-accent/70">local search</span>}
        </div>
      </div>
    </div>
  )
}
