import { Menu } from "lucide-react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="h-16 bg-black/50 backdrop-blur-md border-b border-white/10" >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">

        <Link to="/" className="flex items-center">
  <img
    src="/logo.png"
    alt="Synapse Logo"
    className="w-35 shrink-0"
    style={{ marginRight: "-45px", marginTop: "7px" }}
  />
  <span className="text-white text-lg font-medium tracking-wide">
    SYNAPSE
  </span>
</Link>



          {/* Right: Nav */}
          <div className="flex items-center gap-8">
          <a
              href="#features"
              className="text-md text-white/70 hover:text-white transition"
            >
             Features
            </a>
            <a
              href="#architecture"
              className="text-md text-white/70 hover:text-white transition"
            >
              Docs
            </a>
            <a
              href="https://github.com/Pradeep-10x/Synapse"
              className="text-md text-white/70 hover:text-white transition"
            >
              GitHub
            </a>

           

            {/* Menu Button */}
             <Link
            to="/register"  >
            <button
  className="
    bg-[#2B2A33] text-white
    px-[11px] py-[5px]
    rounded-[7px]
    border border-transparent
    hover:border-white
    transition-colors duration-150
  "
>

  Get Started
</button>
</Link>


          </div>

        </div>
      </div>
    </header>
  );
}
