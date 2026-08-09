import React, { useState } from "react";
import { Camera, Lock, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LandingPageProps {
  stallId?: string;
  onStartOrder: () => void;
  onGoToAdmin: (role: "super_admin" | "stall_owner", stallId: string) => void;
}

export default function LandingPage({ stallId = "stall_1", onStartOrder, onGoToAdmin }: LandingPageProps) {
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [stallSettings, setStallSettings] = useState<any>(null);

  React.useEffect(() => {
    fetch(`/api/settings?stall_id=${stallId}`)
      .then(r => r.json())
      .then(data => setStallSettings(data))
      .catch(console.error);
  }, [stallId]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/stalls/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        onGoToAdmin(data.role, data.stallId);
        setShowPinEntry(false);
        setPin("");
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 2000);
        setPin("");
      }
    } catch (err) {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
      setPin("");
    }
  };

  return (
    <motion.div 
      id="landing-page" 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-[#f2f0ef] text-slate-900 flex flex-col justify-between selection:bg-amber-100 selection:text-slate-900 relative overflow-hidden"
    >
      {/* Admin Access Trigger */}
      <button 
        onClick={(e) => { e.stopPropagation(); setShowPinEntry(true); }}
        className="absolute top-8 right-8 p-3 text-slate-300 hover:text-slate-400 transition-colors z-30 flex items-center gap-2 text-[10px] font-sans font-black uppercase tracking-widest"
        title="Admin Console Login"
      >
        <Settings className="w-5 h-5 text-slate-400" /> Admin
      </button>

      {/* PIN Modal Overlay */}
      <AnimatePresence>
        {showPinEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/20 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center gap-4 text-center mb-8">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-serif font-medium text-slate-800">Console Access</h3>
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Enter Console PIN</p>
                </div>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-6">
                <input 
                  type="password"
                  autoFocus
                  maxLength={32}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Password / PIN"
                  className={`w-full text-center text-xl tracking-[0.3em] py-5 bg-slate-50 border rounded-3xl outline-none transition-all ${
                    pinError ? "border-rose-500 bg-rose-50" : "border-slate-100 focus:border-[#8c2a1a]/30"
                  }`}
                />

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-1.5">
                  <p className="text-[9px] font-sans font-black text-slate-400 uppercase tracking-widest">Demo Console PINs:</p>
                  <p className="text-[10px] font-sans text-slate-600 font-bold">👑 Master Owner: <code className="bg-purple-100 font-mono px-1.5 py-0.5 rounded text-purple-900">0000</code> or <code className="bg-purple-100 font-mono px-1.5 py-0.5 rounded text-purple-900">1234</code></p>
                  <p className="text-[10px] font-sans text-slate-600 font-bold">🏪 Stall #1 (Goa): <code className="bg-emerald-100 font-mono px-1.5 py-0.5 rounded text-emerald-900">1111</code></p>
                  <p className="text-[10px] font-sans text-slate-600 font-bold">🏪 Stall #2 (Manali): <code className="bg-emerald-100 font-mono px-1.5 py-0.5 rounded text-emerald-900">2222</code></p>
                  <p className="text-[10px] font-sans text-slate-600 font-bold">🏪 Stall #3 (Calangute): <code className="bg-emerald-100 font-mono px-1.5 py-0.5 rounded text-emerald-900">3333</code></p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#8c2a1a] text-white text-[10px] font-sans font-black tracking-widest uppercase rounded-full shadow-lg transition-transform active:scale-95"
                  >
                    Verify PIN
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowPinEntry(false)}
                    className="w-full py-2 text-[10px] font-sans font-black tracking-widest text-slate-400 uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative background */}
      <div className="absolute top-[40%] left-[60%] w-[600px] h-[600px] border border-slate-200/50 rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] border border-slate-200/40 rounded-full pointer-events-none" />

      {/* TOP HEADER */}
      <header className="pt-12 flex flex-col items-center gap-1.5 relative z-10">
        <span className="text-[10px] font-sans tracking-[0.4em] font-black text-slate-400 uppercase">
          SNAPFRAME • MULTI-STALL SaaS ATELIER
        </span>
      </header>

      {/* CENTRAL CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center gap-10 relative z-10 px-6">
        
        {/* STALL BRANDING CAPSULE */}
        <div className="inline-flex items-center gap-3 px-8 py-3 border border-slate-200/80 rounded-full bg-white/70 backdrop-blur-md shadow-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${stallSettings?.isActive !== false ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
          <span className="text-[10px] font-sans tracking-[0.2em] font-black text-slate-800 uppercase">
            📍 {stallSettings?.stallName || "Goa Beach Stall #1"} ({stallSettings?.location || "Baga Beach, Goa"}) • ₹{stallSettings?.pricePerFrame || 299} / FRAME
          </span>
        </div>

        {stallSettings?.isActive === false && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl px-8 py-4 text-rose-700 text-xs font-sans font-black uppercase tracking-widest flex items-center gap-3 shadow-sm animate-bounce">
            ⚠️ STALL SUBSCRIPTION PAUSED BY PLATFORM OWNER — PLEASE CHECK BACK SHORTLY
          </div>
        )}

        {/* ELEGANT SERIF TITLE */}
        <div className="text-center space-y-2">
          <h1 className="text-8xl sm:text-9xl font-serif font-medium tracking-tight text-[#8c2a1a] leading-[0.85]">
            Capture
          </h1>
          <h2 className="text-8xl sm:text-9xl font-serif italic font-medium tracking-tight text-slate-900 leading-[0.85]">
            your
          </h2>
          <h2 className="text-8xl sm:text-9xl font-serif italic font-medium tracking-tight text-slate-900 leading-[0.85]">
            moment
          </h2>
        </div>

        {/* INTERACTIVE DIVIDER */}
        <div className="w-20 h-px bg-slate-300" />

        {/* CIRCULAR TOUCH BUTTON */}
        <motion.div 
          onClick={onStartOrder}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex flex-col items-center justify-center gap-4 w-48 h-48 rounded-full border border-slate-300 bg-white/30 backdrop-blur-sm transition-all duration-500 hover:border-[#8c2a1a]/30 group cursor-pointer shadow-xl"
        >
          <Camera className="w-10 h-10 text-[#8c2a1a] stroke-[1.2]" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-sans tracking-[0.2em] font-black text-slate-800 uppercase">
              TOUCH
            </span>
            <span className="text-[10px] font-sans tracking-[0.2em] font-black text-slate-800 uppercase">
              TO START
            </span>
          </div>
        </motion.div>

        {/* ANIMATED PROMPT */}
        <motion.p 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[11px] font-sans tracking-[0.3em] font-bold text-slate-400 uppercase mt-4"
        >
          TAP CIRCLE TO BEGIN CRAFTING
        </motion.p>
      </main>

      {/* FOOTER STATUS */}
      <footer className="pb-10 flex flex-col items-center gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-sans tracking-[0.3em] font-bold text-slate-400 uppercase">
            STALL ONLINE
          </span>
        </div>
      </footer>
    </motion.div>
  );
}
