import { useState, useEffect } from 'react';
import { Menu, X, Zap } from 'lucide-react';

const links = [
  { label: 'Home', href: '#hero' },
  { label: 'Sessions', href: '#sessions' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#docs' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#060918]/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-space font-bold text-lg">Trading Beast</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-sm text-gray-300 hover:text-white px-4 py-2 transition-colors">
            Sign In
          </a>
          <a
            href="/dashboard"
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(79,109,255,0.4)] transition-all"
          >
            Open App →
          </a>
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#060918] border-b border-white/10 px-6 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-gray-300 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a href="/dashboard" className="block text-center bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold px-5 py-2.5 rounded-full">
            Open App →
          </a>
        </div>
      )}
    </header>
  );
}