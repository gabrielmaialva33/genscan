import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { type LucideIcon } from 'lucide-react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '~/shared/utils/cn'

const buttonVariants = cva(
  'cursor-pointer group whitespace-nowrap focus-visible:outline-none inline-flex items-center justify-center has-data-[arrow=true]:justify-between whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active data-[state=open]:bg-primary-hover shadow-sm hover:shadow-md',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active data-[state=open]:bg-secondary-hover shadow-sm hover:shadow-md',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-hover data-[state=open]:bg-destructive-hover shadow-sm hover:shadow-md',
        outline:
          'bg-transparent text-foreground border-2 border-border hover:bg-surface-1 hover:border-border-strong active:bg-surface-2 data-[state=open]:bg-surface-1',
        ghost:
          'text-foreground hover:bg-surface-1 hover:text-foreground active:bg-surface-2 data-[state=open]:bg-surface-1',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary-hover active:text-primary-active',
        success:
          'bg-success text-success-foreground hover:bg-success-hover active:bg-success-hover data-[state=open]:bg-success-hover shadow-sm hover:shadow-md',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning-hover active:bg-warning-hover data-[state=open]:bg-warning-hover shadow-sm hover:shadow-md',
        info: 'bg-info text-info-foreground hover:bg-info-hover active:bg-info-hover data-[state=open]:bg-info-hover shadow-sm hover:shadow-md',
      },
      size: {
        lg: 'h-10 rounded-md px-4 text-sm gap-1.5 [&_svg:not([class*=size-])]:size-4',
        md: 'h-9 rounded-md px-3 gap-1.5 text-[0.8125rem] leading-[1.25rem] [&_svg:not([class*=size-])]:size-4',
        sm: 'h-7 rounded-md px-2.5 gap-1.25 text-xs [&_svg:not([class*=size-])]:size-3.5',
        xs: 'h-6 rounded-md px-2 gap-1 text-xs [&_svg:not([class*=size-])]:size-3',
        icon: 'size-9 rounded-md [&_svg:not([class*=size-])]:size-4 shrink-0',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
        square: 'rounded-none',
      },
      loading: {
        true: 'pointer-events-none opacity-70',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      shape: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      asChild = false,
      loading,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, shape, loading }), className)}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!loading && LeftIcon && <LeftIcon />}
        {children}
        {!loading && RightIcon && <RightIcon />}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
