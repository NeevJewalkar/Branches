import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CommandPalette } from '@/components/CommandPalette'
import { EdgeLayer } from '@/components/EdgeLayer'
import { NodeCard } from '@/components/NodeCard'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { ShortcutHelp } from '@/components/ShortcutHelp'
import { SuggestionPopup } from '@/components/SuggestionPopup'
import { Toolbar } from '@/components/Toolbar'
import { useGraph } from '@/hooks/useGraph'
import type { GraphNode, NodeSize, Position, Suggestion } from '@/types'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.5
const ZOOM_STEP = 1.2
const NODE_OFFSET_X = 140
const NODE_OFFSET_Y = 30
const MIN_DRAG = 3

type View = { x: number; y: number; k: number }
type Rect = { x1: number; y1: number; x2: number; y2: number }

type NodeInteraction = {
  type: 'node'
  origins: Array<{ id: number; x: number; y: number }>
  startX: number
  startY: number
}
type ConnectInteraction = {
  type: 'connect'
  from: number
  startX: number
  startY: number
  moved: boolean
  toggleOnClick: boolean
}

type Interaction =
  | NodeInteraction
  | ConnectInteraction
  | { type: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { type: 'marquee'; x1: number; y1: number; additive: boolean }

export function GraphCanvas() {
  const {
    nodes,
    positions,
    addNode,
    moveNodes,
    setContent,
    removeNodes,
    connect,
    disconnect,
    fetchSuggestions,
    addBranch,
  } = useGraph()

  const viewportRef = useRef<HTMLDivElement>(null)
  const interaction = useRef<Interaction | null>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 })
  const spaceRef = useRef(false)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const editingRef = useRef<number | null>(null)
  const selectedIdsRef = useRef<Set<number>>(new Set())

  const [view, setView] = useState<View>(viewRef.current)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [sizes, setSizes] = useState<Record<number, NodeSize>>({})
  const [connectLine, setConnectLine] = useState<{ from: number; x: number; y: number } | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<{ from: number; to: number } | null>(null)
  const [marquee, setMarquee] = useState<Rect | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [extendingId, setExtendingId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<{ nodeId: number; items: Suggestion[] } | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  viewRef.current = view
  editingRef.current = editingId
  selectedIdsRef.current = selectedIds

  const nodesRef = useRef<GraphNode[]>(nodes)
  const positionsRef = useRef<Record<number, Position>>(positions)
  const sizesRef = useRef<Record<number, NodeSize>>(sizes)
  nodesRef.current = nodes
  positionsRef.current = positions
  sizesRef.current = sizes

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const el = viewportRef.current
    if (!el) return { x: clientX, y: clientY }
    const rect = el.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - rect.left - v.x) / v.k, y: (clientY - rect.top - v.y) / v.k }
  }, [])

  const onSize = useCallback((id: number, size: NodeSize) => {
    setSizes((s) => {
      const prev = s[id]
      if (prev && prev.w === size.w && prev.h === size.h) return s
      return { ...s, [id]: size }
    })
  }, [])

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor))
      const wx = (px - v.x) / v.k
      const wy = (py - v.y) / v.k
      return { k, x: px - wx * k, y: py - wy * k }
    })
  }, [])

  const zoomCenter = useCallback(
    (factor: number) => {
      const el = viewportRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor)
    },
    [zoomAt],
  )

  const spawnNode = useCallback(
    async (worldX: number, worldY: number) => {
      const node = await addNode('', { x: worldX - NODE_OFFSET_X, y: worldY - NODE_OFFSET_Y })
      if (node) {
        setSelectedIds(new Set([node.id]))
        setEditingId(node.id)
      }
    },
    [addNode],
  )

  const addNodeHere = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const v = viewRef.current
    const p = pointerRef.current
    const inside =
      p !== null && p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom
    if (inside && p) {
      const w = toWorld(p.x, p.y)
      void spawnNode(w.x, w.y)
    } else {
      void spawnNode((rect.width / 2 - v.x) / v.k, (rect.height / 2 - v.y) / v.k)
    }
  }, [spawnNode, toWorld])

  const exitEditing = useCallback(() => {
    if (editingRef.current === null) return
    const active = document.activeElement as HTMLElement | null
    if (active && active.tagName === 'TEXTAREA') active.blur()
    else setEditingId(null)
  }, [])

  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if ((e.target as Element).closest('[data-node-id]')) return
      exitEditing()
      setSuggestions(null)
      const panning = e.button === 1 || spaceRef.current || !e.shiftKey
      if (panning) {
        if (e.button !== 0 && e.button !== 1) return
        e.preventDefault()
        const v = viewRef.current
        interaction.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y }
        return
      }
      if (e.button !== 0) return
      const additive = e.metaKey || e.ctrlKey
      if (!additive) setSelectedIds(new Set())
      setSelectedEdge(null)
      interaction.current = { type: 'marquee', x1: e.clientX, y1: e.clientY, additive }
      setMarquee({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY })
    },
    [exitEditing],
  )

  const onNodePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, node: GraphNode) => {
      e.stopPropagation()
      exitEditing()
      setSuggestions(null)

      if (e.shiftKey) {
        const w = toWorld(e.clientX, e.clientY)
        interaction.current = {
          type: 'connect',
          from: node.id,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          toggleOnClick: true,
        }
        setConnectLine({ from: node.id, x: w.x, y: w.y })
        return
      }

      const additive = e.metaKey || e.ctrlKey

      if (additive) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(node.id)) next.delete(node.id)
          else next.add(node.id)
          return next
        })
      } else {
        setSelectedIds((prev) => (prev.has(node.id) ? prev : new Set([node.id])))
      }
      setSelectedEdge(null)

      const dragIds = additive
        ? [node.id]
        : selectedIdsRef.current.has(node.id)
          ? Array.from(selectedIdsRef.current)
          : [node.id]
      const origins = dragIds.map((id) => {
        const pos = positionsRef.current[id] ?? { x: 0, y: 0 }
        return { id, x: pos.x, y: pos.y }
      })
      interaction.current = { type: 'node', origins, startX: e.clientX, startY: e.clientY }
    },
    [exitEditing, toWorld],
  )

  const onEdgePointerDown = useCallback(
    (from: number, to: number, e: ReactPointerEvent<SVGLineElement>) => {
      e.stopPropagation()
      exitEditing()
      setSuggestions(null)
      setSelectedIds(new Set())
      setSelectedEdge({ from, to })
    },
    [exitEditing],
  )

  const onConnectStart = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, node: GraphNode) => {
      e.stopPropagation()
      exitEditing()
      const w = toWorld(e.clientX, e.clientY)
      interaction.current = {
        type: 'connect',
        from: node.id,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        toggleOnClick: false,
      }
      setConnectLine({ from: node.id, x: w.x, y: w.y })
    },
    [toWorld, exitEditing],
  )

  const onBackgroundDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if ((e.target as Element).closest('[data-node-id]')) return
      const w = toWorld(e.clientX, e.clientY)
      void spawnNode(w.x, w.y)
    },
    [toWorld, spawnNode],
  )

  const onCommit = useCallback(
    (id: number, content: string) => {
      setContent(id, content)
      setEditingId(null)
    },
    [setContent],
  )

  const onStartEdit = useCallback((id: number) => {
    setSelectedIds(new Set([id]))
    setEditingId(id)
  }, [])

  const focusNode = useCallback((id: number) => {
    const el = viewportRef.current
    const pos = positionsRef.current[id]
    if (!el || !pos) return
    const rect = el.getBoundingClientRect()
    const size = sizesRef.current[id]
    const cx = pos.x + (size ? size.w : 280) / 2
    const cy = pos.y + (size ? size.h : 56) / 2
    setView((v) => ({ x: rect.width / 2 - cx * v.k, y: rect.height / 2 - cy * v.k, k: v.k }))
    setSelectedIds(new Set([id]))
    setSelectedEdge(null)
  }, [])

  const handleExtend = useCallback(
    async (id: number) => {
      setExtendingId(id)
      setSuggestionsLoading(true)
      setSuggestionError(null)
      setSuggestions({ nodeId: id, items: [] })
      try {
        const items = await fetchSuggestions(id)
        setSuggestions({ nodeId: id, items })
      } catch (err) {
        console.error('extend failed', err)
        setSuggestionError((err as Error).message ?? 'extension failed')
        setSuggestions({ nodeId: id, items: [] })
      } finally {
        setSuggestionsLoading(false)
        setExtendingId(null)
      }
    },
    [fetchSuggestions],
  )

  const handleRegenerate = useCallback(async () => {
    if (!suggestions) return
    const { nodeId } = suggestions
    setSuggestionsLoading(true)
    setSuggestionError(null)
    try {
      const items = await fetchSuggestions(nodeId)
      setSuggestions({ nodeId, items })
    } catch (err) {
      console.error('extend failed', err)
      setSuggestionError((err as Error).message ?? 'extension failed')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [suggestions, fetchSuggestions])

  const handleAcceptSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      const current = suggestions
      if (!current) return
      setSuggestions(null)
      setSuggestionError(null)
      try {
        const child = await addBranch(current.nodeId, suggestion.content)
        setSelectedIds(new Set([child.id]))
        setSelectedEdge(null)
      } catch (err) {
        console.error('branch failed', err)
      }
    },
    [suggestions, addBranch],
  )

  const dismissSuggestions = useCallback(() => {
    setSuggestions(null)
    setSuggestionError(null)
  }, [])

  useEffect(() => {
    const applyNodeDrag = (it: NodeInteraction, clientX: number, clientY: number) => {
      const k = viewRef.current.k
      const dx = (clientX - it.startX) / k
      const dy = (clientY - it.startY) / k
      moveNodes(it.origins.map((o) => ({ id: o.id, pos: { x: o.x + dx, y: o.y + dy } })))
    }

    let frame = 0
    let latest: PointerEvent | null = null

    const process = () => {
      frame = 0
      const e = latest
      latest = null
      const it = interaction.current
      if (!e || !it) return
      if (it.type === 'node') {
        applyNodeDrag(it, e.clientX, e.clientY)
      } else if (it.type === 'connect') {
        const w = toWorld(e.clientX, e.clientY)
        setConnectLine((c) => (c ? { ...c, x: w.x, y: w.y } : c))
        if (!it.moved && Math.hypot(e.clientX - it.startX, e.clientY - it.startY) > MIN_DRAG) {
          it.moved = true
        }
      } else if (it.type === 'marquee') {
        setMarquee({ x1: it.x1, y1: it.y1, x2: e.clientX, y2: e.clientY })
      } else {
        setView((v) => ({ ...v, x: it.ox + (e.clientX - it.sx), y: it.oy + (e.clientY - it.sy) }))
      }
    }

    const onMove = (e: PointerEvent) => {
      latest = e
      if (frame === 0) frame = requestAnimationFrame(process)
    }

    const onUp = (e: PointerEvent) => {
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
        latest = null
      }
      const it = interaction.current
      interaction.current = null
      if (!it) return

      if (it.type === 'node') {
        applyNodeDrag(it, e.clientX, e.clientY)
      } else if (it.type === 'connect') {
        const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null
        const target = el ? el.closest('[data-node-id]') : null
        const raw = target ? (target as HTMLElement).dataset.nodeId : undefined
        const to = raw !== undefined ? Number(raw) : NaN
        if (!Number.isNaN(to) && to !== it.from) {
          void connect(it.from, to)
        } else if (it.toggleOnClick && !it.moved) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(it.from)) next.delete(it.from)
            else next.add(it.from)
            return next
          })
        }
        setConnectLine(null)
      } else if (it.type === 'marquee') {
        const { x1, y1 } = it
        const x2 = e.clientX
        const y2 = e.clientY
        if (Math.hypot(x2 - x1, y2 - y1) > MIN_DRAG) {
          const a = toWorld(Math.min(x1, x2), Math.min(y1, y2))
          const b = toWorld(Math.max(x1, x2), Math.max(y1, y2))
          const pos = positionsRef.current
          const sz = sizesRef.current
          const hits = nodesRef.current
            .filter((n) => {
              const p = pos[n.id]
              if (!p) return false
              const w = sz[n.id] ? sz[n.id].w : 280
              const h = sz[n.id] ? sz[n.id].h : 56
              return p.x <= b.x && p.x + w >= a.x && p.y <= b.y && p.y + h >= a.y
            })
            .map((n) => n.id)
          setSelectedIds((prev) => (it.additive ? new Set([...prev, ...hits]) : new Set(hits)))
        }
        setMarquee(null)
      } else if (it.type === 'pan') {
        if (Math.hypot(e.clientX - it.sx, e.clientY - it.sy) < MIN_DRAG) {
          setSelectedIds(new Set())
          setSelectedEdge(null)
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [toWorld, moveNodes, connect])

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const target = e.target as HTMLElement | null
      if (
        editingRef.current !== null ||
        (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
      ) {
        return
      }
      spaceRef.current = true
      e.preventDefault()
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useEffect(() => {
    if (editingId !== null) return
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, editingId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        exitEditing()
        setPaletteOpen((o) => !o)
        return
      }
      if (editingId !== null || paletteOpen || settingsOpen) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return
      }

      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomCenter(ZOOM_STEP)
        return
      }
      if (mod && e.key === '-') {
        e.preventDefault()
        zoomCenter(1 / ZOOM_STEP)
        return
      }
      if (mod && e.key === '0') {
        e.preventDefault()
        setView({ x: 0, y: 0, k: 1 })
        return
      }
      if (mod) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        addNodeHere()
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        if (selectedIds.size === 1) {
          e.preventDefault()
          setEditingId(Array.from(selectedIds)[0])
        }
      } else if (e.key === 'x' || e.key === 'X') {
        if (selectedIds.size === 1) {
          e.preventDefault()
          void handleExtend(Array.from(selectedIds)[0])
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEdge) {
          e.preventDefault()
          void disconnect(selectedEdge.from, selectedEdge.to)
          setSelectedEdge(null)
        } else if (selectedIds.size > 0) {
          e.preventDefault()
          const ids = Array.from(selectedIds)
          setSelectedIds(new Set())
          void removeNodes(ids)
        }
      } else if (e.key === 'Escape') {
        interaction.current = null
        setConnectLine(null)
        setSelectedIds(new Set())
        setSelectedEdge(null)
        setMarquee(null)
        setShowHelp(false)
        setSuggestions(null)
        setSuggestionError(null)
      } else if (e.key === '?') {
        e.preventDefault()
        setShowHelp((s) => !s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    editingId,
    paletteOpen,
    settingsOpen,
    selectedIds,
    selectedEdge,
    removeNodes,
    disconnect,
    addNodeHere,
    zoomCenter,
    exitEditing,
    handleExtend,
  ])

  const activeSuggestion = suggestions ? nodes.find((n) => n.id === suggestions.nodeId) : undefined
  const activeSuggestionPos = suggestions ? positions[suggestions.nodeId] : undefined
  let suggestionAnchor: { x: number; y: number } | null = null
  if (suggestions && activeSuggestion && activeSuggestionPos) {
    const el = viewportRef.current
    const vpW = el ? el.clientWidth : 0
    const vpH = el ? el.clientHeight : 0
    const POPUP_W = 320
    const nodeW = sizes[suggestions.nodeId] ? sizes[suggestions.nodeId].w : 280
    let left = view.x + (activeSuggestionPos.x + nodeW) * view.k + 12
    if (vpW > 0 && left + POPUP_W > vpW - 8) {
      left = Math.max(8, view.x + activeSuggestionPos.x * view.k - POPUP_W - 12)
    }
    let top = view.y + activeSuggestionPos.y * view.k
    top = vpH > 0 ? Math.max(8, Math.min(top, vpH - 340)) : Math.max(8, top)
    suggestionAnchor = { x: left, y: top }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <Toolbar
        zoom={view.k}
        onAdd={addNodeHere}
        onZoomIn={() => zoomCenter(ZOOM_STEP)}
        onZoomOut={() => zoomCenter(1 / ZOOM_STEP)}
        onReset={() => setView({ x: 0, y: 0, k: 1 })}
        onToggleHelp={() => setShowHelp((s) => !s)}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {showHelp && <ShortcutHelp />}

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CommandPalette
        open={paletteOpen}
        nodes={nodes}
        onClose={() => setPaletteOpen(false)}
        onSelect={focusNode}
      />

      <div
        ref={viewportRef}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={(e) => {
          pointerRef.current = { x: e.clientX, y: e.clientY }
        }}
        onDoubleClick={onBackgroundDoubleClick}
        className="graph-grid absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          <EdgeLayer
            nodes={nodes}
            positions={positions}
            sizes={sizes}
            connectLine={connectLine}
            selectedEdge={selectedEdge}
            onEdgePointerDown={onEdgePointerDown}
          />

          {nodes.map((node) => {
            const pos = positions[node.id]
            if (!pos) return null
            return (
              <NodeCard
                key={node.id}
                node={node}
                x={pos.x}
                y={pos.y}
                selected={selectedIds.has(node.id)}
                editing={node.id === editingId}
                onBodyPointerDown={onNodePointerDown}
                onConnectStart={onConnectStart}
                onSize={onSize}
                onCommit={onCommit}
                onStartEdit={onStartEdit}
                onExtend={handleExtend}
                extending={node.id === extendingId}
              />
            )
          })}
        </div>
      </div>

      {suggestions && suggestionAnchor && (
        <SuggestionPopup
          x={suggestionAnchor.x}
          y={suggestionAnchor.y}
          nodeContent={activeSuggestion ? activeSuggestion.content : ''}
          suggestions={suggestions.items}
          loading={suggestionsLoading}
          error={suggestionError}
          onAccept={handleAcceptSuggestion}
          onRegenerate={handleRegenerate}
          onDismiss={dismissSuggestions}
        />
      )}

      {marquee && (
        <div
          className="pointer-events-none fixed z-30 border border-accent bg-accent/10"
          style={{
            left: Math.min(marquee.x1, marquee.x2),
            top: Math.min(marquee.y1, marquee.y2),
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
          }}
        />
      )}
    </div>
  )
}
