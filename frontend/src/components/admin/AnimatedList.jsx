import { motion } from 'framer-motion'
import { staggerContainer } from './animations'

export default function AnimatedList({ children, className }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}
