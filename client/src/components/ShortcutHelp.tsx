const SHORTCUTS: Array<[string, string]> = [
  ['drag', 'pan'],
  ['drag on node', 'move node'],
  ['Shift + drag node', 'connect'],
  ['Shift + drag canvas', 'select (marquee)'],
  ['Ctrl + click', 'add / remove node'],
  ['N', 'new node'],
  ['E / Enter', 'edit selected'],
  ['X', 'extend with AI'],
  ['Del', 'delete selected'],
  ['Esc', 'clear / cancel'],
  ['Ctrl K', 'search nodes'],
  ['Ctrl + / -', 'zoom in / out'],
  ['Ctrl 0', 'reset zoom'],
  ['?', 'toggle this help'],
]

export function ShortcutHelp() {
  return (
    <div className="absolute bottom-4 left-4 z-10 border border-line bg-surface/95 px-3 py-2 text-xs text-fg shadow-lg backdrop-blur-md">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-accent">❯</span>
        <span className="font-semibold tracking-tight">shortcuts</span>
      </div>
      <ul className="space-y-1">
        {SHORTCUTS.map(([key, label]) => (
          <li key={key} className="flex items-center gap-3">
            <kbd className="min-w-[76px] border border-line bg-elevated px-1.5 py-0.5 text-center text-accent">
              {key}
            </kbd>
            <span className="text-muted">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
