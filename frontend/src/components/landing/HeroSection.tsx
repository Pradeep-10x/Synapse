import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Hero"
      className="
        relative min-h-dvh
        flex items-center justify-center
        overflow-hidden
      "
    >
      {/* Background image + dark blur overlay */}
      <div
        aria-hidden
        className="
          absolute inset-0
          bg-[url('/bg-image.png')]
          bg-cover bg-center bg-no-repeat

          after:absolute after:inset-0
          after:bg-black/30
          after:backdrop-blur-md
        "
      />

      {/* Content */}
      <ScrollReveal
        rootMargin="0px"
        className="
          relative z-10
          max-w-2xl mx-auto
          text-center
          px-4 pt-24 pb-28
        "
      >
        {/* Logo */}
        <span className="flex justify-center ">
          <img
            src="/logo.png"
            alt="Synapse logo"
            className="block w-[350px]"
            decoding="async"
            fetchpriority="high"
            style={{  marginBottom: "-70px",marginTop:"-35px" }}
          />
        </span>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-5">
          Synapse
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-lg mx-auto leading-relaxed">
          A real-time interaction system for communities
          <br />
          and live activities..
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="
              inline-flex items-center justify-center
              px-8 py-4 rounded-md
              font-semibold text-white
              bg-gradient-to-b from-blue-500 to-blue-600
              hover:from-blue-700 hover:to-blue-700
             
              
            "
          >
            Get Started
          </Link>

          <a
            href="#overview"
            className="
              inline-flex items-center justify-center
              px-8 py-4 rounded-md
              font-semibold
              text-white/90
              border border-white/30
              hover:bg-white/10
              transition-colors duration-200
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-white/50
              focus-visible:ring-offset-2
              focus-visible:ring-offset-black
            "
          >
            {/* <Plus className="w-5 h-5 shrink-0" aria-hidden /> */}
             Architecture
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
