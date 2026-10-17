import type {
  GraphNode,
  SearchResult,
  Settings,
  SettingsPatch,
  Suggestion,
  SuggestionLens,
  TestResult,
} from '@/types'

const NODES = '/nodes'

function ensureOk(res: Response) {
  if (!res.ok) throw new Error(`request failed: ${res.status} ${res.statusText}`)
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body?.error === 'string' && body.error) return body.error
  } catch {
    void 0
  }
  return `request failed: ${res.status} ${res.statusText}`
}

export async function getNodes(): Promise<GraphNode[]> {
  const res = await fetch(`${NODES}/getNodes`)
  ensureOk(res)
  const data = (await res.json()) as GraphNode[]
  return Array.isArray(data) ? data : []
}

export async function addNode(node: { content: string; connections: number[] }): Promise<number> {
  const res = await fetch(`${NODES}/addNode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(node),
  })
  ensureOk(res)
  const data = (await res.json()) as { id: number }
  return data.id
}

const LENSES: SuggestionLens[] = ['challenge', 'angle', 'extend']

function normalizeLens(value: unknown): SuggestionLens | null {
  if (typeof value !== 'string') return null
  const v = value.toLowerCase()
  if (LENSES.includes(v as SuggestionLens)) return v as SuggestionLens
  if (v.includes('challenge') || v.includes('push') || v.includes('risk')) return 'challenge'
  if (v.includes('angle') || v.includes('perspective') || v.includes('reframe')) return 'angle'
  if (v.includes('extend') || v.includes('elaborate') || v.includes('build')) return 'extend'
  return null
}

export async function extendNode(id: number): Promise<Suggestion[]> {
  const res = await fetch(`${NODES}/extendNode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const o = item as { lens?: unknown; content?: unknown }
    const content = typeof o.content === 'string' ? o.content.trim() : ''
    if (!content) return []
    return [{ lens: normalizeLens(o.lens) ?? 'extend', content }]
  })
}

export async function editNode(id: number, content: string): Promise<void> {
  const res = await fetch(`${NODES}/editNode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, content }),
  })
  ensureOk(res)
}

export async function connectNodes(ids: number[]): Promise<void> {
  const res = await fetch(`${NODES}/connectNodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids),
  })
  ensureOk(res)
}

export async function searchNodes(query: string, limit = 20): Promise<SearchResult[]> {
  const res = await fetch(`${NODES}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  })
  ensureOk(res)
  const data = (await res.json()) as SearchResult[]
  return Array.isArray(data) ? data : []
}

export async function deleteConnection(nodeId1: number, nodeId2: number): Promise<void> {
  const res = await fetch(`${NODES}/deleteConnection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId1, nodeId2 }),
  })
  ensureOk(res)
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch('/settings')
  ensureOk(res)
  return (await res.json()) as Settings
}

export async function saveSettings(patch: SettingsPatch): Promise<Settings> {
  const res = await fetch('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  ensureOk(res)
  return (await res.json()) as Settings
}

export async function testSettings(patch: SettingsPatch): Promise<TestResult> {
  const res = await fetch('/settings/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (res.ok) return { ok: true, ...((await res.json()) as { sample?: string }) }
  return { ok: false, error: await errorMessage(res) }
}

export async function removeNode(id: number): Promise<void> {
  const res = await fetch(`${NODES}/removeNode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  ensureOk(res)
}
