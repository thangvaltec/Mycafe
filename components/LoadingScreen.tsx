
import React, { useState, useEffect } from 'react';

const LoadingScreen: React.FC = () => {
    const [msgIndex, setMsgIndex] = useState(0);
    const messages = ["Đang chuẩn bị không gian...", "Đang khởi động hệ thống...", "Vui lòng đợi trong giây lát!"];

    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % messages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[1000] bg-[#0a0a0a] flex flex-col items-center justify-center p-4 overflow-hidden font-sans">

            {/* 1. AMBIENT BACKGROUND - LUXURY HALL */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1a140e_0%,#050505_100%)]"></div>

            {/* Dynamic Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#c2a383]/10 rounded-full blur-[140px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#004d26]/10 rounded-full blur-[160px] animate-pulse"></div>

            <div className="relative w-full max-w-[800px] aspect-[16/9] flex items-center justify-center scale-90 sm:scale-100">

                {/* 2. PLAYER SILHOUETTE - ENHANCED VISIBILITY */}
                <div className="absolute left-[-100px] bottom-[10%] w-[350px] h-[400px] z-40 opacity-30 pointer-events-none animate-player-fade">
                    <svg viewBox="0 0 200 200" className="w-full h-full fill-[#222]">
                        <path d="M20,180 Q40,150 60,140 L100,120 Q120,110 140,115 L180,125 Q190,130 185,140 L150,170 Q140,180 120,180 Z" />
                        <path d="M100,120 Q90,105 105,95 L120,90 Q130,85 130,100 Z" />
                    </svg>
                </div>

                {/* 3. THE PREMIUM BILLIARD TABLE */}
                <div className="relative w-full h-[360px] bg-[#004d26] rounded-[50px] shadow-[0_80px_150px_-30px_rgba(0,0,0,1)] border-[22px] border-[#312116] ring-1 ring-white/10 overflow-hidden">

                    {/* Table Details: Diamonds & Felt */}
                    <div className="absolute top-[-10px] left-0 w-full h-2 flex justify-around px-20">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#c2a383]/60 rounded-full"></div>)}
                    </div>

                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.4)_100%)]"></div>
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>

                    {/* Pockets */}
                    <div className="absolute -top-5 -left-5 w-20 h-20 bg-black rounded-full shadow-inner border border-white/5"></div>
                    <div className="absolute -top-5 -right-5 w-20 h-20 bg-black rounded-full shadow-inner border border-white/5"></div>
                    <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-black rounded-full shadow-inner border border-white/5"></div>
                    <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-black rounded-full shadow-inner border border-white/5"></div>
                    <div className="absolute left-1/2 -top-6 -translate-x-1/2 w-20 h-12 bg-black rounded-b-full"></div>
                    <div className="absolute left-1/2 -bottom-6 -translate-x-1/2 w-20 h-12 bg-black rounded-t-full"></div>

                    {/* 4. THE PERFECT BREAK ACTION */}

                    {/* Cue Stick */}
                    <div className="absolute left-[-180px] top-1/2 -translate-y-1/2 w-[380px] h-3.5 bg-gradient-to-r from-[#1a110a] via-[#8c6b4f] to-[#fff] rounded-r-full shadow-2xl animate-perfect-cue z-50">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-full"></div>
                    </div>

                    {/* Cue Ball */}
                    <div className="absolute left-24 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#fdfcf8] rounded-full shadow-2xl animate-perfect-cue-ball z-30">
                        <div className="absolute top-1 left-2 w-3 h-3 bg-white rounded-full opacity-60"></div>
                    </div>

                    {/* Exploding Rack */}
                    <div className="absolute left-[65%] top-1/2 -translate-y-1/2 w-2 h-2">
                        {[
                            { id: 8, color: '#111', sink: 'sink-8' },
                            { id: 1, color: '#ffcc00', sink: 'sink-1' },
                            { id: 2, color: '#0044cc', sink: 'sink-2' },
                            { id: 3, color: '#cc0000', sink: 'sink-3' },
                            { id: 9, color: '#ffeb3b', sink: 'sink-9' }
                        ].map(ball => (
                            <div key={ball.id} className={`absolute w-9 h-9 rounded-full shadow-xl flex items-center justify-center border border-white/5 z-20 -translate-x-1/2 -translate-y-1/2`} style={{ backgroundColor: ball.color, animation: `${ball.sink} 6s infinite cubic-bezier(0.165, 0.84, 0.44, 1)` }}>
                                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[7px] font-black text-black">{ball.id}</div>
                            </div>
                        ))}
                    </div>

                    {/* 5. ULTIMATE BRAND REVEAL */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-[60] animate-brand-glow opacity-0 pointer-events-none">
                        <div className="flex flex-col items-center w-full px-8">
                            {/* Brand Name - Responsive & Large */}
                            <h1 className="text-5xl lg:text-8xl font-black text-white uppercase tracking-[-0.04em] italic drop-shadow-[0_15px_40px_rgba(0,0,0,1)] text-center whitespace-nowrap">
                                Bống Coffee
                            </h1>

                            {/* Slogan - Bigger, Clearer, Premium */}
                            <div className="mt-4 flex items-center gap-6 w-full justify-center">
                                <div className="h-[2px] flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-[#c2a383]"></div>
                                <span className="text-[14px] lg:text-[18px] text-[#dac2a9] font-black uppercase tracking-[0.4em] whitespace-nowrap drop-shadow-md">
                                    Sân Vườn & Billiards
                                </span>
                                <div className="h-[2px] flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-[#c2a383]"></div>
                            </div>

                            {/* Massive Coffee Cup - The Core Brand */}
                            <div className="mt-12 group">
                                <div className="relative animate-bounce scale-150 lg:scale-[2]">
                                    <i className="fas fa-mug-hot text-[#c2a383] text-6xl drop-shadow-[0_10px_20px_rgba(194,163,131,0.3)]"></i>
                                    {/* Artistic Steam */}
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-3">
                                        <div className="w-2.5 h-10 bg-white/30 rounded-full animate-elegant-steam blur-[2px]"></div>
                                        <div className="w-2.5 h-14 bg-white/50 rounded-full animate-elegant-steam delay-150 blur-[2px]"></div>
                                        <div className="w-2.5 h-10 bg-white/30 rounded-full animate-elegant-steam delay-300 blur-[2px]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* 6. STATUS - BETTER TYPOGRAPHY */}
            <div className="mt-16 text-center animate-fade-in flex flex-col items-center gap-4">
                <div className="flex gap-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-[#c2a383] rounded-full animate-bounce shadow-[0_0_10px_rgba(194,163,131,0.5)]" style={{ animationDelay: `${i * 0.2}s` }}></div>
                    ))}
                </div>
                <p className="text-[11px] lg:text-[13px] font-black text-[#dac2a9] uppercase tracking-[0.5em] italic drop-shadow-sm whitespace-nowrap">
                    Hệ thống đang sẵn sàng phục vụ...
                </p>
            </div>

            <style>{`
        @keyframes player-fade {
          0%, 100% { opacity: 0; transform: translateX(-30px); }
          10%, 30% { opacity: 0.3; transform: translateX(0); }
          40% { opacity: 0; transform: translateX(-15px); }
        }
        @keyframes perfect-cue {
          0% { transform: translate(-50px, -50%) rotate(-3deg); opacity: 0; }
          15% { transform: translate(0px, -50%) rotate(0deg); opacity: 1; }
          22% { transform: translate(60px, -50%); }
          35% { transform: translate(-120px, -50%); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes perfect-cue-ball {
          0%, 22% { transform: translate(0, -50%); opacity: 1; }
          30% { transform: translate(360px, -50%); }
          50% { transform: translate(400px, -180px) scale(0.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-8 {
          0%, 30% { transform: translate(0,0) scale(1.1); opacity: 1; }
          50% { transform: translate(-100px, 140px) rotate(1080deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-110px, 180px) scale(0.3); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-1 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(200px, -140px) rotate(720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(240px, -200px) scale(0.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-2 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-380px, 140px) rotate(-720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-420px, 180px) scale(0.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-3 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-380px, -140px) rotate(720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-420px, -200px) scale(0.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-9 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-100px, -140px) rotate(-720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-110px, -200px) scale(0.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes brand-glow {
          0%, 55% { opacity: 0; transform: scale(0.85); filter: blur(20px); }
          75% { opacity: 1; transform: scale(1.05); filter: blur(0px); }
          85% { transform: scale(1); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        @keyframes elegant-steam {
          0%, 100% { transform: translateY(0) scaleX(1); opacity: 0; }
          50% { transform: translateY(-35px) scaleX(1.8); opacity: 0.5; }
        }
        .animate-player-fade { animation: player-fade 6s infinite ease-in-out; }
        .animate-perfect-cue { animation: perfect-cue 6s infinite cubic-bezier(0.19, 1, 0.22, 1); }
        .animate-perfect-cue-ball { animation: perfect-cue-ball 6s infinite cubic-bezier(0.1, 0, 0.1, 1); }
        .animate-brand-glow { animation: brand-glow 6s infinite cubic-bezier(0.23, 1, 0.32, 1); }
        .animate-elegant-steam { animation: elegant-steam 3s infinite ease-in-out; }
        .animate-fade-in { animation: fadeIn 2s ease-out both; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
