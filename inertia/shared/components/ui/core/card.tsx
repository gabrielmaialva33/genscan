import * as React from 'react'
import { cn } from '~/shared/utils/cn'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    border?: boolean
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    variant?: 'default' | 'elevated' | 'outline'
  }
>(({ className, border = true, shadow = 'sm', variant = 'default', ...props }, ref) => {
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  }

  const variantClasses = {
    default: 'bg-card text-card-foreground',
    elevated:
      'bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow duration-200',
    outline: 'bg-transparent border-2 text-foreground',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg transition-all duration-200',
        variantClasses[variant],
        variant !== 'outline' && border && 'border border-border',
        variant === 'outline' && 'border-border-strong',
        shadowClasses[shadow],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    border?: boolean
  }
>(({ className, border = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', border && 'border-b', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  }
>(({ className, as: Comp = 'h3', ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-foreground-muted', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    border?: boolean
  }
>(({ className, border = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', border && 'border-t border-border pt-6', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
