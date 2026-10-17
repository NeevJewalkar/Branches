# Branches

A spatial canvas for thinking. Start with one idea, then branch it into more — connect nodes, explore tangents, and let an LLM add its own thoughts when you're stuck.

When you **extend** a node, the model contributes three of its own ideas along different lenses:

- **challenge** — pushes back on the idea
- **another angle** — reframes it
- **extend** — carries it further

Accept any of them to grow a new connected branch.

## Features

- Infinite canvas: pan, zoom, marquee-select, multi-node drag
- Nodes + connections, edit in place
- AI extension with three lenses and regenerate
- Bring your own model: any OpenAI-compatible API (Groq, OpenAI, OpenRouter, Together, a local Ollama, …)
- Dark / light themes, a `Ctrl/Cmd+K` command palette, and keyboard shortcuts (`?`)

## Stack

- **Client:** Vite + React + TypeScript + Tailwind CSS v4
- **Server:** Node (ESM) + Express, JSON file storage, OpenAI SDK

## Getting started

Requires Node 20+.

```bash
npm install      # root tooling
npm run setup    # install backend + frontend deps
npm run dev      # start backend AND frontend together
```

This starts the backend (`http://127.0.0.1:3000`) and the Vite dev server (`http://localhost:5173`) with prefixed logs; `Ctrl+C` stops both. Then open http://localhost:5173.

Prefer separate terminals? Run `npm run dev:server` and `npm run dev:client` instead. `npm run build` produces the production client bundle.

## Configure the model

Open **settings** in the app's toolbar and set:

- **base url** — an OpenAI-compatible endpoint (defaults to Groq)
- **model** — e.g. `openai/gpt-oss-20b`, `gpt-4o-mini`, …
- **api key** — your key for that endpoint

Use **test connection** to verify before saving. Settings are stored in `server/settings.json` (gitignored) and the key is never sent back to the browser.

Prefer env vars? Copy `server/src/.env.example` to `server/src/.env` and set `GROQ_API_KEY`. The app uses it as a fallback when no key is set in the drawer.

## Notes

- The backend binds to `127.0.0.1` only. The Vite dev server is the single exposed port and proxies `/nodes` and `/settings` to it, so other devices on your LAN can reach the app but not the raw API or keys.

## License

[MIT](LICENSE)
