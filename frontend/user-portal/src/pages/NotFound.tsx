import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, LayoutDashboard, CircleHelp } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-center max-w-sm"
      >
        <motion.div
          initial={{ rotate: -12, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center"
        >
          <Compass className="w-10 h-10 text-[var(--color-accent)]" />
        </motion.div>

        <p className="font-display text-6xl font-bold mt-6">404</p>
        <h1 className="font-display text-xl font-bold mt-2">Off the radar</h1>
        <p className="text-[var(--color-text-muted)] mt-2">
          This page is not on any session's focus list. It may have moved, or the link is wrong.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link to="/dashboard" className="btn btn-primary flex-1">
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link to="/help" className="btn btn-secondary flex-1">
            <CircleHelp className="w-4 h-4" />
            Help
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
