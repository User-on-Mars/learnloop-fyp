// Shared Framer Motion animation variants for the admin panel
// Used across PageTransition, AnimatedList, and ConfirmAction components

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

// Staggered list container
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } }
}

// Staggered list item
export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
}

// Modal backdrop
export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

// Modal content
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
}
