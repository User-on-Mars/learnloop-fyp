import { motion } from 'framer-motion'
import { pageVariants } from './animations'

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={pageVariants.initial}
      animate={pageVariants.animate}
      transition={pageVariants.transition}
    >
      {children}
    </motion.div>
  )
}
