import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
      },
      interactive: {
        true: 'cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  },
)

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>, VariantProps<typeof badgeVariants> {
  onClick?: () => void
  interactive?: boolean
}

function Badge({ className, variant, interactive, onClick, children, ...props }: BadgeProps) {
  // When interactive, render as button for accessibility
  if (interactive || onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(badgeVariants({ variant, interactive: true }), className)}
        // Pass safe attributes
        style={props.style}
        title={props.title}
        id={props.id}
        aria-label={props['aria-label']}
      >
        {children}
      </button>
    )
  }

  // Non-interactive badges remain as divs
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
