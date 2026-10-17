export type GraphNode = {
  id: number
  content: string
  connections: number[]
}

export type Position = { x: number; y: number }

export type NodeSize = { w: number; h: number }

export type SearchResult = {
  id: number
  content: string
  score?: number
}

export type Settings = {
  baseURL: string
  model: string
  hasKey: boolean
  keySource: 'settings' | 'env' | null
  keyHint: string
  defaults: { baseURL: string; model: string }
}

export type SettingsPatch = {
  baseURL?: string
  model?: string
  apiKey?: string
  clearKey?: boolean
}

export type TestResult = { ok: boolean; sample?: string; error?: string }

export type SuggestionLens = 'challenge' | 'angle' | 'extend'

export type Suggestion = {
  lens: SuggestionLens
  content: string
}
