import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'avatar' | 'card' | 'button'
}

const Skeleton = ({ className, variant = 'text' }: SkeletonProps) => {
  const variants = {
    text: 'h-4 w-full',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-48 w-full',
    button: 'h-10 w-24',
  }

  return (
    <div
      className={cn(
        'skeleton',
        variants[variant],
        className
      )}
    />
  )
}

export default Skeleton
