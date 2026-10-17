import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Suggestion, SuggestionLens } from '@/types'

const LENS_LABEL: Record<SuggestionLens, string> = {
  challenge: 'challenge',
  angle: 'another angle',
  extend: 'extend',
}

const LENS_ORDER: SuggestionLens[] = ['challenge', 'angle', 'extend']

type Props = {
  x: number
  y: number
  nodeContent: string
  suggestions: Suggestion[]
  loading: boolean
  error: string | null
  onAccept: (suggestion: Suggestion) => void
  onRegenerate: () => void
  onDismiss: () => void
}

export function SuggestionPopup({
  x,
  y,
  nodeContent,
  suggestions,
  loading,
  error,
  onAccept,
  onRegenerate,
  onDismiss,
}: Props) {
  const ordered = [...suggestions].sort(
    (a, b) => LENS_ORDER.indexOf(a.lens) - LENS_ORDER.indexOf(b.lens),
  )

  return (
    <div
      className="popover-panel absolute z-40 w-[320px] border border-line bg-surface/95 backdrop-blur-md"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5">
        <span className="text-accent">❯</span>
        <span className="font-semibold tracking-tight text-fg">extend</span>
        <span className="min-w-0 flex-1 truncate text-muted">{nodeContent || 'empty'}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="cursor-pointer text-muted hover:text-accent"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1.5 p-2">
        {loading ? (
          LENS_ORDER.map((lens) => (
            <div key={lens} className="border border-line/60 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-accent/70">
                {LENS_LABEL[lens]}
              </div>
              <div className="mt-1 h-3 w-3/4 animate-pulse bg-elevated" />
            </div>
          ))
        ) : error ? (
          <div className="border border-red-500/50 px-3 py-3 text-red-400">
            {error}
            <div className="mt-1 text-muted">check your endpoint, model and API key in settings</div>
          </div>
        ) : ordered.length === 0 ? (
          <div className="px-3 py-4 text-center text-muted">no thoughts — regenerate</div>
        ) : (
          ordered.map((s, i) => (
            <button
              key={`${s.lens}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onAccept(s)}
              className={cn(
                'group block w-full cursor-pointer border border-line bg-transparent px-3 py-2 text-left transition-colors',
                'hover:border-accent hover:bg-elevated',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-accent">
                  {LENS_LABEL[s.lens]}
                </span>
                <span className="text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                  branch +
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-fg">{s.content}</div>
            </button>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={loading}>
          regenerate
        </Button>
        <span className="text-[10px] text-muted">esc to dismiss</span>
      </div>
    </div>
  )
}