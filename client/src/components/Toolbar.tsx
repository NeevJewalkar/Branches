import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

type Props = {
  zoom: number
  onAdd: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onToggleHelp: () => void
  onOpenSearch: () => void
  onOpenSettings: () => void
}

export function Toolbar({
  zoom,
  onAdd,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleHelp,
  onOpenSearch,
  onOpenSettings,
}: Props) {
  const { theme, toggle } = useTheme()

  return (
    <div
      className="absolute left-4 top-4 z-10 flex items-center gap-3 border border-line bg-surface/95 px-3 py-1.5 text-fg shadow-lg backdrop-blur-md"
      onMouseDown={(e) => {
        if ((e.target as Element).closest('button')) e.preventDefault()
      }}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-accent">❯</span>
        <span className="font-semibold tracking-tight text-fg">Branches</span>
      </span>

      <span className="text-line">|</span>

      <Button variant="default" size="sm" onClick={onAdd}>
        new node
      </Button>

      <span className="text-line">|</span>

      <span className="flex items-center gap-1.5">
        <span className="text-muted">zoom</span>
        <Button variant="ghost" size="icon" onClick={onZoomOut} aria-label="Zoom out">
          &minus;
        </Button>
        <button
          type="button"
          onClick={onReset}
          className="min-w-[48px] cursor-pointer text-xs text-accent hover:text-fg"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" onClick={onZoomIn} aria-label="Zoom in">
          +
        </Button>
      </span>

      <span className="hidden text-muted md:inline">
        // dbl-click or <span className="text-accent">N</span> to add &middot; drag{' '}
        <span className="text-accent">+</span> to link
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSearch}
        aria-label="Search nodes"
        title="Search nodes (Ctrl/Cmd K)"
      >
        search
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        aria-label="LLM settings"
        title="LLM settings"
      >
        settings
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-label="Toggle theme"
        title="Toggle dark / light"
      >
        {theme}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleHelp}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </Button>
    </div>
  )
}
