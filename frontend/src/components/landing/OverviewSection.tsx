import ScrollReveal from "./ScrollReveal";

export default function OverviewSection() {
  return (
    <section
    id="overview"
    aria-labelledby="overview-heading"
    className="
      relative
      py-16 md:py-28 lg:py-65
      px-6 md:px-20 lg:px-40
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
