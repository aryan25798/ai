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
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-black font-sans selection:bg-blue-500/30 text-white overflow-hidden px-4 sm:px-6">
      
      {/* --- 1. BACKGROUND EFFECTS --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130%] h-[560px] bg-gradient-to-b from-blue-900/35 via-purple-900/20 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay"></div>
      <div 
        className="absolute bottom-0 w-full h-[55vh] opacity-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #000 90%), linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'linear-gradient(to bottom, transparent, black)'
        }}
      />

      {/* --- 2. MAIN CARD --- */}
      <div className="relative z-10 w-full max-w-[440px] px-6 sm:px-4">
        
        <div className="group relative rounded-3xl p-[1px] overflow-hidden bg-gradient-to-b from-white/20 to-white/0 shadow-[0_50px_120px_-30px_rgba(0,0,0,1)] transition-all duration-700 hover:scale-[1.02]">
          
          {/* Inner Card Background */}
          <div className="relative h-full w-full rounded-3xl bg-[#0a0a0a] p-8 sm:p-9 md:p-11">
            
            {/* Inner Glow (Top) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-[3px] bg-blue-500 blur-[28px] group-hover:w-56 transition-all duration-700" />

            {/* Header Content */}
            <div className="flex flex-col items-center text-center space-y-8">
              
              {/* LOGO SECTION (ENHANCED) */}
              <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/5 border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.04)] transition-all duration-500 group-hover:border-blue-500/50 p-3">
                <img 
                  src="/icon.png" 
                  alt="TurboLearn Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] relative z-10 rounded-2xl" 
                />
                <div className="absolute inset-0 rounded-3xl border border-blue-500/25 animate-ping opacity-20" />
                <Sparkles size={26} className="absolute -top-3 -right-3 text-blue-400 animate-bounce z-20" />
              </div>

              {/* Text */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-xl">
                  TurboLearn
                </h1>
                <p className="text-sm sm:text-base text-neutral-400 max-w-[320px] mx-auto leading-relaxed">
                  The next-generation dual-core reasoning engine for accelerated learning.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />

            {/* Action Area */}
            <div className="space-y-5">
              
              {/* Shimmer Button */}
              <button 
                onClick={handleLogin}
                className="group/btn relative w-full overflow-hidden rounded-xl bg-white p-[1px] focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-[0.97] transition-transform"
              >
                <span className="absolute inset-[-300%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#3B82F6_50%,#E2CBFF_100%)]" />
                <span className="relative flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-all duration-300 group-hover/btn:bg-slate-900">
                  <LogIn size={20} className="text-blue-400" />
                  <span>Continue with Google</span>
                  <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300 text-neutral-400" />
                </span>
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] uppercase tracking-widest text-neutral-600 font-medium pt-2">
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
        <div className="mt-10 text-center space-y-4">
          <p className="text-[10px] text-neutral-500">
            By accessing TurboLearn, you agree to our{' '}
            <span className="underline decoration-neutral-700 hover:text-neutral-300 cursor-pointer transition-colors">Terms</span>{' '}
            and{' '}
            <span className="underline decoration-neutral-700 hover:text-neutral-300 cursor-pointer transition-colors">Privacy Policy</span>.
          </p>

          <p className="text-[11px] tracking-widest uppercase text-neutral-600">
            Built by <span className="text-neutral-400 font-medium">Aryan</span>
          </p>
        </div>

      </div>
    </div>
  );
}
