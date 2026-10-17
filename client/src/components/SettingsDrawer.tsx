import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import * as api from '@/lib/api'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: Props) {
  const [baseURL, setBaseURL] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [keySource, setKeySource] = useState<'settings' | 'env' | null>(null)
  const [keyHint, setKeyHint] = useState('')
  const [defaults, setDefaults] = useState<{ baseURL: string; model: string }>({
    baseURL: '',
    model: '',
  })
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const apply = useCallback((s: Awaited<ReturnType<typeof api.getSettings>>) => {
    setBaseURL(s.baseURL)
    setModel(s.model)
    setHasKey(s.hasKey)
    setKeySource(s.keySource)
    setKeyHint(s.keyHint)
    setDefaults(s.defaults)
  }, [])

  useEffect(() => {
    if (!open) return
    setApiKey('')
    setStatus(null)
    api
      .getSettings()
      .then(apply)
      .catch((err) => setStatus({ kind: 'err', text: String(err.message ?? err) }))
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open, apply])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const patch = useCallback(() => {
    const p: { baseURL: string; model: string; apiKey?: string } = { baseURL, model }
    if (apiKey.trim()) p.apiKey = apiKey
    return p
  }, [baseURL, model, apiKey])

  const onSave = useCallback(async () => {
    setBusy(true)
    setStatus({ kind: 'info', text: 'saving…' })
    try {
      const saved = await api.saveSettings(patch())
      apply(saved)
      setApiKey('')
      setStatus({ kind: 'ok', text: 'saved' })
    } catch (err) {
      setStatus({ kind: 'err', text: String((err as Error).message ?? err) })
    } finally {
      setBusy(false)
    }
  }, [patch, apply])

  const onTest = useCallback(async () => {
    setBusy(true)
    setStatus({ kind: 'info', text: 'testing…' })
    try {
      const result = await api.testSettings(patch())
      if (result.ok) setStatus({ kind: 'ok', text: `connected — reply: "${result.sample ?? 'ok'}"` })
      else setStatus({ kind: 'err', text: result.error ?? 'test failed' })
    } catch (err) {
      setStatus({ kind: 'err', text: String((err as Error).message ?? err) })
    } finally {
      setBusy(false)
    }
  }, [patch])

  const onClearKey = useCallback(async () => {
    setBusy(true)
    try {
      const saved = await api.saveSettings({ clearKey: true })
      apply(saved)
      setApiKey('')
      setStatus({ kind: 'info', text: 'key removed' })
    } catch (err) {
      setStatus({ kind: 'err', text: String((err as Error).message ?? err) })
    } finally {
      setBusy(false)
    }
  }, [apply])

  if (!open) return null

  const keyPlaceholder = hasKey
    ? `${keyHint || '••••'} — from ${keySource === 'env' ? 'server env' : 'settings'}`
    : 'paste an API key'

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onPointerDown={onClose}>
      <aside
        className="popover-panel absolute right-0 top-0 flex h-full w-[380px] max-w-[92vw] flex-col border-l border-line bg-surface"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="text-accent">❯</span>
          <span className="font-semibold tracking-tight text-fg">settings</span>
          <span className="text-muted">llm endpoint</span>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="ml-auto cursor-pointer text-muted hover:text-accent"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
          <p className="text-muted">
            Point branch at any OpenAI-compatible API. Base URL defaults to Groq; use your own
            provider by changing it.
          </p>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted">base url</span>
            <input
              ref={firstFieldRef}
              type="text"
              value={baseURL}
              spellCheck={false}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder={defaults.baseURL}
              className="mt-1 w-full border border-line bg-bg px-2.5 py-1.5 text-fg outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted">model</span>
            <input
              type="text"
              value={model}
              spellCheck={false}
              onChange={(e) => setModel(e.target.value)}
              placeholder={defaults.model}
              className="mt-1 w-full border border-line bg-bg px-2.5 py-1.5 text-fg outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
              api key
              {hasKey && keySource === 'settings' && (
                <button
                  type="button"
                  onClick={onClearKey}
                  disabled={busy}
                  className="cursor-pointer normal-case tracking-normal text-muted hover:text-accent disabled:opacity-40"
                >
                  remove
                </button>
              )}
            </span>
            <input
              type="password"
              value={apiKey}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              className="mt-1 w-full border border-line bg-bg px-2.5 py-1.5 text-fg outline-none focus:border-accent"
            />
          </label>

          {status && (
            <div
              className={cn(
                'border px-2.5 py-1.5',
                status.kind === 'ok'
                  ? 'border-accent/40 text-accent'
                  : status.kind === 'err'
                    ? 'border-red-500/50 text-red-400'
                    : 'border-line text-muted',
              )}
            >
              {status.text}
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3">
          <Button variant="default" size="sm" onClick={onSave} disabled={busy}>
            save
          </Button>
          <Button variant="secondary" size="sm" onClick={onTest} disabled={busy}>
            test connection
          </Button>
          <span className="ml-auto text-[10px] text-muted">esc to close</span>
        </footer>
      </aside>
    </div>
  )
}
