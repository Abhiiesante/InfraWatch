import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { INFRA_IMAGES } from '@/lib/infraImages';
import { Building2, Activity, BrainCircuit, ArrowRight } from 'lucide-react';

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Hero Parallax & Fade
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);

  // Lens State
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative bg-[#EEF2F3] text-[#3A4046] overflow-x-hidden min-h-[300vh]">
      
      {/* 1. CINEMATIC LENS HERO */}
      <motion.section 
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        {/* Base layer (Beautiful infrastructure) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${INFRA_IMAGES.bridge[0]})`, filter: 'brightness(0.9)' }}
        />

        {/* X-Ray / Thermal Lens Layer */}
        <AnimatePresence>
          {isHoveringHero && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute z-10 pointer-events-none rounded-full overflow-hidden"
              style={{
                width: 400,
                height: 400,
                x: mousePosition.x - 200,
                y: mousePosition.y - 200,
                backdropFilter: 'saturate(200%) contrast(120%) blur(2px)',
                border: '1px solid rgba(255,255,255,0.4)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.2)',
              }}
            >
              {/* Inside the lens, we simulate thermal/AI vision by showing a heavily filtered version of the same image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${INFRA_IMAGES.bridge[0]})`,
                  backgroundPosition: `${-(mousePosition.x - 200)}px ${-(mousePosition.y - 200)}px`,
                  filter: 'contrast(1.5) saturate(3) hue-rotate(90deg) brightness(1.2)',
                  width: '100vw',
                  height: '100vh',
                }}
              />
              {/* Scanline overlay */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 mix-blend-overlay"></div>
              {/* Targeting Reticle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border border-[#7FB8B0]/80 rounded-full animate-ping"></div>
                <div className="absolute w-2 h-2 bg-[#E08585] rounded-full"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Atmospheric Gradient */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#EEF2F3] via-transparent to-[rgba(238,242,243,0.5)]" />

        {/* Hero Content */}
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)', color: '#3A4046', backdropFilter: 'blur(10px)' }}>
              Enterprise Infrastructure OS
            </span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#3A4046] to-[#6B7280] leading-[1.1] drop-"
          >
            See deeper.<br/>Act faster.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="mt-6 text-xl md:text-2xl font-medium text-[#4B5563] max-w-2xl mx-auto leading-relaxed drop-"
          >
            The world's most advanced digital twin platform. Merging SCADA telemetry, AI anomaly detection, and 3D BIM into one glass pane.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="mt-10 flex items-center justify-center gap-4 pointer-events-auto"
          >
            <Link to="/login" className="px-8 py-4 rounded-full text-slate-800 font-bold transition-all hover:scale-105 shadow-[0_8px_30px_rgb(127,184,176,0.3)] flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #7FB8B0 0%, #5E9A70 100%)' }}>
              Enter Platform <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* 2. SCROLL-DRIVEN STORYTELLING */}
      <section className="relative z-30 pt-32 pb-48 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {[
            {
              title: "AI Prophet Engine",
              desc: "14-day predictive maintenance forecasting powered by pure JS neural networks.",
              icon: BrainCircuit,
              color: "#7FB8B0"
            },
            {
              title: "Live SCADA Streaming",
              desc: "Sub-second IoT telemetry ingestion with HLS WebRTC camera streams.",
              icon: Activity,
              color: "#E8B978"
            },
            {
              title: "Digital Twin BIM",
              desc: "Full 3D spatial mapping of your enterprise assets seamlessly integrated.",
              icon: Building2,
              color: "#7FA8C9"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.2 }}
              className="p-8 rounded-3xl"
              style={{
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
              }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: `rgba(255,255,255,0.8)`, boxShadow: `0 8px 16px ${feature.color}30` }}>
                <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: '#3A4046' }}>{feature.title}</h3>
              <p className="font-medium leading-relaxed" style={{ color: '#6B7280' }}>{feature.desc}</p>
            </motion.div>
          ))}
          
        </div>
      </section>

      {/* 3. MAGNETIC CTA SECTION */}
      <section className="relative z-30 py-32 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{ color: '#3A4046' }}
          >
            Ready to upgrade your infrastructure?
          </motion.h2>
          
          <motion.div
            className="mt-16 inline-block cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link to="/register" className="px-12 py-6 rounded-full text-slate-800 font-extrabold text-xl shadow-[0_20px_60px_rgb(127,184,176,0.4)] flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #7FB8B0 0%, #5E9A70 100%)' }}>
              Create Organization <ArrowRight className="w-6 h-6" />
            </Link>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
}
