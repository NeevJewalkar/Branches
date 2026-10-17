import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { resolveLlmConfig } from './settingsHelper.js';

// Load .env from this file's directory, independent of the CWD.
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

export const getCompletion = async ({ model, input, system, baseURL, apiKey } = {}) => {
    const config = resolveLlmConfig()
    const key = apiKey || config.apiKey
    if (!key) {
        const err = new Error('No API key set — open settings and add one (or set GROQ_API_KEY in server/src/.env).')
        err.code = 'NO_API_KEY'
        throw err
    }
    const client = new OpenAI({
        apiKey: key,
        baseURL: baseURL || config.baseURL,
    })

    const messages = []
    if (system) messages.push({ role: 'system', content: system })
    messages.push({ role: 'user', content: input })

    const response = await client.chat.completions.create({
        model: model || config.model,
        messages,
    })

    return response.choices?.[0]?.message?.content ?? '';
};

// Turn a provider/SDK error into a status + human message we can surface in the UI.
export const describeLlmError = (err) => {
    const status = err?.status
    const detail = err?.error?.message || err?.message || 'unknown error'
    if (err?.code === 'NO_API_KEY') return { status: 401, message: err.message }
    if (status === 401) return { status: 401, message: 'invalid API key for this endpoint — check settings' }
    if (status === 404) return { status: 404, message: `model or endpoint not found (${detail})` }
    if (status === 429) return { status: 429, message: 'rate limited by the provider — try again shortly' }
    if (typeof status === 'number' && status >= 500) return { status: 502, message: `provider error: ${detail}` }
    return { status: 502, message: detail }
}

const LENSES = ['challenge', 'angle', 'extend']

const normalizeLens = (value) => {
    const v = String(value ?? '').toLowerCase()
    if (!v) return null
    if (LENSES.includes(v)) return v
    if (v.includes('challenge') || v.includes('push') || v.includes('risk') || v.includes('weak') || v.includes('assumption')) return 'challenge'
    if (v.includes('angle') || v.includes('perspective') || v.includes('reframe') || v.includes('alternative')) return 'angle'
    if (v.includes('extend') || v.includes('elaborate') || v.includes('build') || v.includes('next step')) return 'extend'
    return null
}

const parseSuggestions = (raw) => {
    if (!raw) return []
    let text = String(raw).trim()
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1)

    let parsed
    try {
        parsed = JSON.parse(text)
    } catch {
        return []
    }
    if (!Array.isArray(parsed)) return []

    const out = []
    for (const item of parsed) {
        const content = typeof item === 'string' ? item : item?.content
        if (typeof content !== 'string' || !content.trim()) continue
        out.push({ lens: normalizeLens(item?.lens) ?? 'extend', content: content.trim() })
    }
    return out.slice(0, 3)
}

const buildPrompt = (content) => `You are a thinking partner adding your own ideas to a canvas of connected thoughts.

Someone has written this idea (a node on the canvas):
"""${content}"""

Contribute exactly three thoughts of YOUR OWN that branch off it. Each is a standalone idea you are adding to the canvas — the thought itself, stated plainly. Do NOT advise, instruct, or suggest anything to the reader.

Rules:
- Write in a direct, declarative voice. State the idea; never address the reader.
- Never use "you", "consider", "try", "should", "imagine", "let's", or imperative verbs.
- Each thought is 1-2 sentences, concrete and specific to the idea, and could stand alone as a node.
- Return ONLY a JSON array of three objects with keys "lens" and "content".
- "lens" must be exactly one of: "challenge", "angle", "extend".

The three lenses:
- "challenge": a thought that pushes back on the idea — a tension, counterexample, or unexamined assumption it rests on.
- "angle": a thought that reframes the idea from a genuinely different perspective.
- "extend": a thought that carries the idea further — a consequence, implication, or elaboration.

Good thought: "The keeper's fear is misdirected — the sea is indifferent, and what he dreads is the memory it keeps returning to him."
Bad thought (advice to the reader): "Consider that the keeper's fear may be of memories, not the sea."

Example:
[{"lens":"challenge","content":"..."},{"lens":"angle","content":"..."},{"lens":"extend","content":"..."}]`

export const getSuggestions = async (content) => {
    const raw = await getCompletion({ input: buildPrompt(content) })
    return parseSuggestions(raw)
};
