import { cn } from '@/lib/cn'
import { getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-14 h-14 text-lg',
}

const colors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function colorFor(name: string) {
  const i = name.charCodeAt(0) % colors.length
  return colors[i]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden',
      sizes[size],
      !src && colorFor(name),
      className,
    )}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
