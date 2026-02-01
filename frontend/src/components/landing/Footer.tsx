export default function Footer() {
  return (
    <footer className="relative z-10 h-14 bg-black/60 backdrop-blur-md border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <span className="text-sm text-white/80">
          © 2024 Synapse
        </span>
        <div className="flex items-center gap-6">
          <a
            href="#terms"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Terms
          </a>
          <a
            href="#privacy"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
