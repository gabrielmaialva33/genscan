import { useEffect, useRef, useState } from 'react'
import { cn } from '~/shared/utils/cn'

interface RevealTextProps {
  children: string
  className?: string
  delay?: number
  duration?: number
  wordDelay?: number
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
}

export function RevealText({
  children,
  className,
  delay = 0,
  duration = 0.6,
  wordDelay = 0.1,
  as: Component = 'span',
}: RevealTextProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [delay])

  const words = children.split(' ')

  return (
    <Component ref={ref as any} className={cn('inline-block', className)}>
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block overflow-hidden"
          style={{
            marginRight: index < words.length - 1 ? '0.25em' : 0,
          }}
        >
          <span
            className={cn(
              'inline-block transition-all duration-[600ms] ease-out',
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            )}
            style={{
              transitionDelay: `${index * wordDelay}s`,
              transitionDuration: `${duration}s`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </Component>
  )
}
