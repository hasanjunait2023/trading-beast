import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Light page transition: a short fade + slide applied to routed content.
 * Keyed by pathname in Layout so every navigation animates the same way,
 * in both the browser shell and the in-Telegram compact chrome.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
