import type { PointerEvent as ReactPointerEvent } from 'react'
import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { GraphNode, NodeSize, Position } from '@/types'

type ConnectLine = { from: number; x: number; y: number } | null
type Edge = { from: number; to: number }

type Props = {
  nodes: GraphNode[]
  positions: Record<number, Position>
  sizes: Record<number, NodeSize>
  connectLine: ConnectLine
  selectedEdge: Edge | null
  onEdgePointerDown: (from: number, to: number, e: ReactPointerEvent<SVGLineElement>) => void
}

function EdgeLayerImpl({ nodes, positions, sizes, connectLine, selectedEdge, onEdgePointerDown }: Props) {
  const edges = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id))
    const result: Edge[] = []
    const seen = new Set<string>()
    for (const node of nodes) {
      for (const toId of node.connections) {
        if (!ids.has(toId)) continue
        const key = node.id < toId ? `${node.id}-${toId}` : `${toId}-${node.id}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ from: node.id, to: toId })
      }
    }
    return result
  }, [nodes])

  const center = (id: number) => {
    const pos = positions[id]
    const size = sizes[id]
    const w = size ? size.w : 280
    const h = size ? size.h : 56
    return { x: (pos ? pos.x : 0) + w / 2, y: (pos ? pos.y : 0) + h / 2 }
  }

  return (
    <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={4000} height={3000}>
      {edges.map(({ from, to }) => {
        const a = center(from)
        const b = center(to)
        const isSelected = selectedEdge !== null && selectedEdge.from === from && selectedEdge.to === to

        return (
          <g key={`${from}-${to}`} className="group">
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={isSelected ? 2 : 1.5}
              className={cn(
                'transition-colors',
                isSelected ? 'stroke-accent' : 'stroke-muted/50 group-hover:stroke-accent',
              )}
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="transparent"
              strokeWidth={14}
              style={{ pointerEvents: 'stroke' }}
              className="cursor-pointer"
              onPointerDown={(e) => onEdgePointerDown(from, to, e)}
            />
          </g>
        )
      })}

      {connectLine && (
        <line
          x1={center(connectLine.from).x}
          y1={center(connectLine.from).y}
          x2={connectLine.x}
          y2={connectLine.y}
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}
    </svg>
  )
}

export const EdgeLayer = memo(EdgeLayerImpl)
