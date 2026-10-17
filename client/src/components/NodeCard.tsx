import type { PointerEvent as ReactPointerEvent } from 'react'
import { memo, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { GraphNode, NodeSize } from '@/types'

type Props = {
  node: GraphNode
  x: number
  y: number
  selected: boolean
  editing: boolean
  onBodyPointerDown: (e: ReactPointerEvent<HTMLDivElement>, node: GraphNode) => void
  onConnectStart: (e: ReactPointerEvent<HTMLButtonElement>, node: GraphNode) => void
  onSize: (id: number, size: NodeSize) => void
  onCommit: (id: number, content: string) => void
  onStartEdit: (id: number) => void
  onExtend: (id: number) => void
  extending: boolean
}

function NodeCardImpl({
  node,
  x,
  y,
  selected,
  editing,
  onBodyPointerDown,
  onConnectStart,
  onSize,
  onCommit,
  onStartEdit,
  onExtend,
  extending,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const onSizeRef = useRef(onSize)
  onSizeRef.current = onSize

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => onSizeRef.current(node.id, { w: el.offsetWidth, h: el.offsetHeight })
    report()
    const observer = new ResizeObserver(report)
    observer.observe(el)
    return () => observer.disconnect()
  }, [node.id])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [editing, node.content])

  return (
    <div
      ref={ref}
      data-node-id={node.id}
      style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
      onPointerDown={(e) => onBodyPointerDown(e, node)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onStartEdit(node.id)
      }}
      className={cn(
        'group absolute left-0 top-0 w-[280px] select-none border bg-surface px-4 py-3 text-fg transition-colors',
        extending
          ? 'border-accent'
          : selected
            ? 'node-selected border-accent'
            : 'border-line hover:border-accent/50',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="select-none text-accent/70">❯</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea
              ref={textareaRef}
              autoFocus
              defaultValue={node.content}
              rows={1}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => onCommit(node.id, e.target.value.trim())}
              onInput={(e) => {
                const ta = e.currentTarget
                ta.style.height = 'auto'
                ta.style.height = `${ta.scrollHeight}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') e.currentTarget.blur()
              }}
              className="w-full resize-none bg-transparent text-fg outline-none"
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {node.content || <span className="text-muted">empty</span>}
            </div>
          )}
        </div>
      </div>

      {extending && (
        <div className="mt-1.5 text-[10px] tracking-wider text-accent">extending…</div>
      )}

      <button
        type="button"
        aria-label="Extend with AI"
        disabled={extending}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onExtend(node.id)
        }}
        className="absolute -top-2.5 right-2 border border-line bg-elevated px-1.5 py-0.5 text-[10px] leading-none text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
      >
        extend
      </button>

      <button
        type="button"
        aria-label="Connect"
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => onConnectStart(e, node)}
        className="absolute -right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-crosshair items-center justify-center border border-line bg-elevated text-[11px] leading-none text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:border-accent hover:text-accent"
      >
        +
      </button>
    </div>
  )
}

export const NodeCard = memo(NodeCardImpl)
