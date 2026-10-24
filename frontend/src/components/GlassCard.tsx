import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

const GlassCard = ({ children, className = '', hover = true, onClick }: GlassCardProps) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`glass-card ${className}`}
    >
      {children}
    </motion.div>
  )
}

export default GlassCard
