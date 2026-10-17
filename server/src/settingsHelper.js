import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SETTINGS_FILE = join(__dirname, '..', 'settings.json')

export const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1'
export const DEFAULT_MODEL = 'openai/gpt-oss-20b'

const defaults = () => ({ baseURL: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' })

const hint = (key) => {
    if (!key) return ''
    if (key.length <= 8) return '•'.repeat(key.length)
    return `${key.slice(0, 4)}…${key.slice(-4)}`
}

const load = () => {
    try {
        const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
        return { ...defaults(), ...parsed }
    } catch {
        return defaults()
    }
}

let settings = load()

const persist = () => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

// The effective key: explicit setting first, then a generic env key, then the
// Groq-specific env key when the endpoint is Groq's.
const resolveApiKey = () => {
    if (settings.apiKey) return settings.apiKey
    if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY
    if (settings.baseURL.includes('groq') && process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY
    return ''
}

// Everything the LLM layer needs to make a call. Not exposed over HTTP.
export const resolveLlmConfig = () => ({
    baseURL: settings.baseURL,
    model: settings.model,
    apiKey: resolveApiKey(),
})

// Safe-to-send view: never includes the raw key.
export const getPublicSettings = () => {
    const key = resolveApiKey()
    return {
        baseURL: settings.baseURL,
        model: settings.model,
        hasKey: key.length > 0,
        keySource: settings.apiKey ? 'settings' : key ? 'env' : null,
        keyHint: hint(key),
        defaults: { baseURL: DEFAULT_BASE_URL, model: DEFAULT_MODEL },
    }
}

export const updateSettings = (patch = {}) => {
    if (typeof patch.baseURL === 'string' && patch.baseURL.trim()) {
        settings.baseURL = patch.baseURL.trim()
    }
    if (typeof patch.model === 'string' && patch.model.trim()) {
        settings.model = patch.model.trim()
    }
    if (patch.clearKey === true) {
        settings.apiKey = ''
    } else if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) {
        settings.apiKey = patch.apiKey.trim()
    }
    persist()
    return getPublicSettings()
}
