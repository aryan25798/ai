'use client';

import { LogIn, ArrowRight, Sparkles } from 'lucide-react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-black font-sans selection:bg-blue-500/30 text-white overflow-hidden">
      
      {/* --- 1. BACKGROUND EFFECTS --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay"></div>
      <div 
        className="absolute bottom-0 w-full h-[50vh] opacity-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #000 90%), linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, transparent, black)'
        }}
      />


      {/* --- 2. MAIN CARD --- */}
      <div className="relative z-10 w-full max-w-[400px] px-6">
        
        <div className="group relative rounded-3xl p-[1px] overflow-hidden bg-gradient-to-b from-white/10 to-white/0 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          
          {/* Inner Card Background */}
          <div className="relative h-full w-full rounded-3xl bg-[#0a0a0a] p-8 md:p-10">
            
            {/* Inner Glow (Top) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-500 blur-[20px] group-hover:w-48 transition-all duration-700" />

            {/* Header Content */}
            <div className="flex flex-col items-center text-center space-y-6">
              
              {/* LOGO SECTION (Updated) */}
              <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 shadow-inner group-hover:border-blue-500/30 transition-colors duration-500 p-2">
                {/* Your Logo Image */}
                <img 
                  src="/icon.png" 
                  alt="TurboLearn Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] relative z-10 rounded-xl" 
                />
                {/* Pulse Effect */}
                <div className="absolute inset-0 rounded-2xl border border-blue-500/20 animate-ping opacity-20" />
                {/* Sparkle Icon */}
                <Sparkles size={20} className="absolute -top-2 -right-2 text-blue-400 animate-bounce z-20" />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-md">
                  TurboLearn
                </h1>
                <p className="text-sm text-neutral-400 max-w-[260px] mx-auto leading-relaxed">
                  The next-generation dual-core reasoning engine for accelerated learning.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />

            {/* Action Area */}
            <div className="space-y-4">
              
              {/* Shimmer Button */}
              <button 
                onClick={handleLogin}
                className="group/btn relative w-full overflow-hidden rounded-xl bg-white p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
              >
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                <span className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2 text-sm font-medium text-white transition-all group-hover/btn:bg-slate-900">
                  <LogIn size={18} className="text-blue-400" />
                  <span>Continue with Google</span>
                  <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300 text-neutral-400" />
                </span>
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-neutral-600 font-medium pt-2">
                <span>Secure</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span>Fast</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span>Private</span>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-[10px] text-neutral-500">
            By accessing TurboLearn, you agree to our <span className="underline decoration-neutral-700 hover:text-neutral-300 cursor-pointer transition-colors">Terms</span> and <span className="underline decoration-neutral-700 hover:text-neutral-300 cursor-pointer transition-colors">Privacy Policy</span>.
          </p>
        </div>

      </div>
    </div>
  );
}