import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { INFRA_IMAGES } from '@/lib/infraImages';
import { Building2, Activity, BrainCircuit, ArrowRight, Radio, Cpu, Shield } from 'lucide-react';
import { useBackgroundRotation } from '@/lib/useBackgroundRotation';

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.06]);
  const { currentIndex } = useBackgroundRotation(INFRA_IMAGES.general, 6000);

  return (
    <div ref={containerRef} className="relative bg-[#0B0D10] text-white overflow-x-hidden min-h-[280vh]">

      {/* ═══ HERO ═══ */}
      <motion.section
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        {/* Rotating BG */}
        <div className="absolute inset-0 z-0">
          {INFRA_IMAGES.general.map((img, i) => (
            <div key={img} className="absolute inset-0" style={{
              backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: i === currentIndex ? 1 : 0, filter: 'brightness(0.55) saturate(1.2)',
              transform: `scale(${i === currentIndex ? 1.04 : 1})`,
              transition: 'opacity 1.8s ease, transform 10s ease-out',
            }} />
          ))}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(11,13,16,0.5) 0%, rgba(11,13,16,0.2) 40%, rgba(11,13,16,0.85) 100%)' }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
          <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-block px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.25em] mb-10"
            style={{ background: 'rgba(127,184,176,0.12)', border: '1px solid rgba(127,184,176,0.3)', color: '#7FB8B0' }}>
            Warehouse Safety &amp; Intelligence Platform
          </motion.span>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-[5.5rem] font-black tracking-tight leading-[1.05]">
            See deeper.
            <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #7FB8B0, #4ED8B0, #7FB8B0)' }}>
              Act faster.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 text-base md:text-lg text-slate-400 max-w-xl leading-relaxed font-medium">
            Real-time SCADA telemetry, AI anomaly detection, digital twin BIM, and predictive maintenance — unified in one platform.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex items-center gap-4">
            <Link to="/login"
              className="group relative px-8 py-4 rounded-full font-bold text-sm text-white overflow-hidden transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7FB8B0, #5E9A70)' }}>
              <span className="relative z-10 flex items-center gap-2">
                Enter Platform <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link to="/register"
              className="px-8 py-4 rounded-full font-bold text-sm text-slate-400 border border-white/15 hover:border-white/30 hover:text-white transition-all">
              Create Account
            </Link>
          </motion.div>
        </div>

      </motion.section>

      {/* ═══ CAPABILITIES ═══ */}
      <section className="relative z-30 pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7FB8B0]">Core Capabilities</span>
          <h2 className="text-3xl md:text-5xl font-black mt-3 text-white tracking-tight">Everything you need to monitor,<br/>predict, and protect.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: "AI Vision Engine", desc: "14-day predictive maintenance with real-time anomaly detection on camera feeds.", icon: BrainCircuit, accent: '#7FB8B0' },
            { title: "Live SCADA & IoT", desc: "Sub-second telemetry from thousands of sensors with WebRTC camera streaming.", icon: Activity, accent: '#E8B978' },
            { title: "3D Digital Twin", desc: "Full BIM spatial mapping, GIS overlay, and drone fleet management in one view.", icon: Building2, accent: '#7FA8C9' },
          ].map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-7 rounded-2xl border border-white/8 hover:border-white/15 transition-all duration-500 group"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}30` }}>
                <f.icon className="w-5 h-5" style={{ color: f.accent }} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative z-30 py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black tracking-tight">
            Ready to see your infrastructure
            <span className="text-transparent bg-clip-text ml-2" style={{ backgroundImage: 'linear-gradient(135deg, #7FB8B0, #4ED8B0)' }}>differently?</span>
          </motion.h2>
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
            className="mt-10">
            <Link to="/register"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-full text-white font-bold text-base transition-all hover:scale-105 hover:shadow-[0_16px_50px_rgba(127,184,176,0.25)]"
              style={{ background: 'linear-gradient(135deg, #7FB8B0, #5E9A70)' }}>
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-30 py-6 border-t border-white/5 text-center">
        <p className="text-[11px] text-slate-600 font-medium">© {new Date().getFullYear()} InfraWatch — Enterprise Infrastructure Intelligence</p>
      </footer>
    </div>
  );
}
