import { MouseEvent, ReactNode, useRef, useState } from 'react'
import { cn } from '~/utils/cn'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
  onClick?: () => void
}

export function MagneticButton({
  children,
  className,
  strength = 0.15,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distanceX = (e.clientX - centerX) * strength
    const distanceY = (e.clientY - centerY) * strength

    // Limit maximum movement to 10px
    const maxDistance = 10
    const limitedX = Math.max(-maxDistance, Math.min(maxDistance, distanceX))
    const limitedY = Math.max(-maxDistance, Math.min(maxDistance, distanceY))

    setPosition({ x: limitedX, y: limitedY })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div
      ref={ref}
      className={cn('magnetic relative inline-block', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {children}
    </div>
  )
}
