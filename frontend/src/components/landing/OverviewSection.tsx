import ScrollReveal from "./ScrollReveal";

/* Lightweight dashboard mock (static, GPU-safe) */
// function DashboardGraphic() {
//   return (
//     <div
//       aria-hidden
//       className="
//         relative rounded-xl
//         border border-blue-500/30
//         bg-[#0a0a0f]/90
//         p-4
//         shadow-[0_0_40px_rgba(59,130,246,0.15)]
//       "
//     >
//       <div className="absolute inset-0 rounded-xl border border-blue-500/20 pointer-events-none" />

//       <div className="text-[10px] font-medium uppercase tracking-wider text-blue-400/80 mb-3">
//         CHIRON
//       </div>

//       <div className="grid grid-cols-2 gap-3">
//         <div className="h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
//           <div className="flex gap-1.5 items-end">
//             {[40, 65, 45, 80, 55].map((h, i) => (
//               <div
//                 key={i}
//                 className="w-2 rounded-t bg-blue-500/70"
//                 style={{ height: `${h}%` }}
//               />
//             ))}
//           </div>
//         </div>

//         <div className="h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
//           <div className="w-12 h-12 rounded-full border-2 border-blue-500/60 flex items-center justify-center text-xs font-semibold text-blue-400">
//             75%
//           </div>
//         </div>
//       </div>

//       <div className="mt-3 h-px bg-white/10" />

//       <div className="mt-3 flex gap-2">
//         <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
//           <div className="h-full w-2/3 rounded-full bg-blue-500/60" />
//         </div>
//         <div className="flex-1 h-1.5 rounded-full bg-blue-500/30" />
//       </div>
//     </div>
//   );
// }

export default function OverviewSection() {
  return (
    <section
    id="overview"
    aria-labelledby="overview-heading"
    className="
      relative
      py-28 md:py-65
      px-40
      bg-black
    
      
    "
  >
    <div className="max-w-6xl mx-auto px-4 sm:px-6 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">
        
        {/* Text */}
        <ScrollReveal>
          <h2
            id="overview-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Real-time interaction system for live communities
          </h2>
  
          <p className="text-lg text-white/70 max-w-xl leading-relaxed mb-10">
            Connect in the moment. Share across domains. Experience events as they happen.
          </p>
  
          <div className="flex flex-col sm:flex-row gap-4">
            {/* buttons unchanged */}
          </div>
        </ScrollReveal>
  
        {/* Visual */}
        <ScrollReveal delay={120}>
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-lg">
             <img src="/Background.svg"></img>
            </div>
          </div>
        </ScrollReveal>
          
       
      </div>
      <button
  onClick={() => {
    const overview = document.getElementById("overview");
    const features = document.getElementById("features");

    if (!overview || !features) return;

    const heroBottom =
      overview.getBoundingClientRect().bottom + window.scrollY;

    window.scrollTo({
      top: heroBottom,
      behavior: "smooth",
    });
  }}
  className="
    inline-flex items-center justify-center
    py-2 px-5 rounded-md
    font-semibold
    text-white/90
    border border-white/30
    hover:bg-white/10
    mt-10 ml-3
  "
>
  Next
</button>
     
    </div>
  </section>
  
  );
}
