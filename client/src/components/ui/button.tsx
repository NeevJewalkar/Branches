import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-accent bg-accent text-accent-fg hover:bg-accent/85',
        secondary: 'border-line bg-transparent text-fg hover:border-accent hover:text-accent',
        ghost: 'border-transparent text-muted hover:text-accent',
        danger: 'border-line text-muted hover:border-fg/60 hover:text-fg',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, onMouseDown, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      onMouseDown={(e) => {
        onMouseDown?.(e)
        e.preventDefault()
      }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
