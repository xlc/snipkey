import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  },
)

export interface BadgeProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof badgeVariants> {
  interactive?: boolean
}

function Badge({ className, variant, interactive, onClick, children, ...props }: BadgeProps) {
  // When interactive or onClick is provided, render as button for accessibility
  if (interactive || onClick) {
    return (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          onClick?.(e)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
          }
        }}
        className={cn(badgeVariants({ variant, interactive: true }), className)}
        {...props}
      >
        {children}
      </button>
    )
  }

  // Non-interactive badges remain as divs
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
