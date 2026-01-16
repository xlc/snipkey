import { cva, type VariantProps } from 'class-variance-authority'

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
        true: 'cursor-pointer touch-manipulation relative focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring before:absolute before:inset-[-10px] before:content-[""]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  },
)

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  onClick?: () => void
  interactive?: boolean
  className?: string
  children?: React.ReactNode
  [key: string]: unknown // Allow any other HTML attributes
}

function Badge({ className, variant, interactive, onClick, children, ...props }: BadgeProps) {
  // When interactive, render as button for accessibility
  if (interactive || onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(badgeVariants({ variant, interactive: true }), className)} {...props}>
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
