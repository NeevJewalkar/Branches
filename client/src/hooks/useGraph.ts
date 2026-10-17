import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '@/lib/api'
import type { GraphNode, Position, Suggestion } from '@/types'

const POSITIONS_KEY = 'branch.positions.v1'
const SAVE_DEBOUNCE_MS = 300

function loadPositions(): Record<number, Position> {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    if (raw) return JSON.parse(raw) as Record<number, Position>
  } catch {
    void 0
  }
  return {}
}

function defaultPosition(index: number): Position {
  const col = index % 4
  const row = Math.floor(index / 4)
  return { x: 140 + col * 300, y: 140 + row * 170 }
}

function dedupe(ids: number[]): number[] {
  return Array.from(new Set(ids))
}

export function useGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [positions, setPositions] = useState<Record<number, Position>>(loadPositions)

  const nodesRef = useRef<GraphNode[]>(nodes)
  const positionsRef = useRef<Record<number, Position>>(positions)
  const saveTimer = useRef<number | null>(null)
  nodesRef.current = nodes
  positionsRef.current = positions

  const savePositions = useCallback(() => {
    try {
      localStorage.setItem(POSITIONS_KEY, JSON.stringify(positionsRef.current))
    } catch {
      void 0
    }
  }, [])

  useEffect(() => {
    if (saveTimer.current !== null) return
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      savePositions()
    }, SAVE_DEBOUNCE_MS)
  }, [positions, savePositions])

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      savePositions()
    }
    window.addEventListener('beforeunload', flush)
    return () => {
      flush()
      window.removeEventListener('beforeunload', flush)
    }
  }, [savePositions])

  const applyNodes = useCallback((fresh: GraphNode[]) => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return fresh.map((fn) => {
        const local = prevById.get(fn.id)
        const content = local && local.content ? local.content : fn.content
        return {
          id: fn.id,
          content,
          connections: dedupe(fn.connections.filter((c) => c !== fn.id)),
        }
      })
    })
    setPositions((prev) => {
      let next = prev
      fresh.forEach((n, i) => {
        if (!(n.id in next)) {
          if (next === prev) next = { ...prev }
          next[n.id] = defaultPosition(i)
        }
      })
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    const fresh = await api.getNodes()
    applyNodes(fresh)
    return fresh
  }, [applyNodes])

  useEffect(() => {
    refresh().catch((err) => console.error('failed to load nodes', err))
  }, [refresh])

  const addNode = useCallback(
    async (content: string, pos: Position) => {
      const id = await api.addNode({ content, connections: [] })
      const fresh = await api.getNodes()
      applyNodes(fresh)
      setPositions((prev) => ({ ...prev, [id]: pos }))
      return fresh.find((n) => n.id === id) ?? { id, content, connections: [] }
    },
    [applyNodes],
  )

  const moveNodes = useCallback((updates: Array<{ id: number; pos: Position }>) => {
    if (updates.length === 0) return
    setPositions((prev) => {
      let next = prev
      for (const update of updates) {
        if (next === prev) next = { ...prev }
        next[update.id] = update.pos
      }
      return next
    })
  }, [])

  const setContent = useCallback((id: number, content: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)))
    void api.editNode(id, content).catch((err) => console.error('failed to save node content', err))
  }, [])

  const removeNodes = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return
      const current = nodesRef.current
      const idSet = new Set(ids)
      const exists = new Set(current.map((n) => n.id))
      const edges = new Set<string>()
      for (const node of current) {
        if (!idSet.has(node.id)) continue
        for (const neighbor of node.connections) {
          if (idSet.has(neighbor) || !exists.has(neighbor)) continue
          edges.add(node.id < neighbor ? `${node.id}-${neighbor}` : `${neighbor}-${node.id}`)
        }
      }
      setNodes((prev) => prev.filter((n) => !idSet.has(n.id)))
      setPositions((prev) => {
        const next = { ...prev }
        for (const id of ids) delete next[id]
        return next
      })

      for (const key of edges) {
        const [a, b] = key.split('-').map(Number)
        await api.deleteConnection(a, b)
      }
      for (const id of ids) await api.removeNode(id)
      const fresh = await api.getNodes()
      applyNodes(fresh)
    },
    [applyNodes],
  )

  const connect = useCallback(
    async (from: number, to: number) => {
      if (from === to) return
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== from && n.id !== to) return n
          const other = n.id === from ? to : from
          return { ...n, connections: dedupe([...n.connections, other]) }
        }),
      )
      await api.connectNodes([from, to])
      const fresh = await api.getNodes()
      applyNodes(fresh)
    },
    [applyNodes],
  )

  const disconnect = useCallback(
    async (from: number, to: number) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== from && n.id !== to) return n
          const other = n.id === from ? to : from
          return { ...n, connections: n.connections.filter((c) => c !== other) }
        }),
      )
      await api.deleteConnection(from, to)
      const fresh = await api.getNodes()
      applyNodes(fresh)
    },
    [applyNodes],
  )

  const fetchSuggestions = useCallback(async (id: number): Promise<Suggestion[]> => {
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node || !node.content.trim()) return []
    return api.extendNode(id)
  }, [])

  const addBranch = useCallback(
    async (parentId: number, content: string) => {
      const parent = nodesRef.current.find((n) => n.id === parentId)
      const childCount = parent ? parent.connections.length : 0
      const pos = positionsRef.current[parentId] ?? { x: 0, y: 0 }
      const child = await addNode(content, { x: pos.x + 360, y: pos.y + childCount * 150 })
      await connect(parentId, child.id)
      return child
    },
    [addNode, connect],
  )

  return {
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
  }
}
