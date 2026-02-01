import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/60 backdrop-blur-md border-b border-white/5">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Synapse" className="h-8 w-8 object-contain shrink-0" />
          <span className="text-lg font-semibold tracking-tight text-white uppercase">
            SYNAPSE
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <a
            href="#architecture"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Architecture
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <button
            type="button"
            aria-label="Menu"
            className="p-2 rounded-lg border border-white/20 bg-white/5 text-white/80 hover:text-white hover:border-white/30 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </header>
  );
}
