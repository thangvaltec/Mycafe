
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
        <div className="fixed inset-0 z-[1000] bg-[#121212] flex flex-col items-center justify-center p-4 overflow-hidden">

            {/* 1. AMBIENT BACKGROUND */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2a1e12_0%,#0a0a0a_100%)] opacity-80"></div>

            <div className="relative w-full max-w-[700px] aspect-[16/9] flex items-center justify-center">

                {/* 2. PLAYER SILHOUETTE */}
                <div className="absolute left-[-80px] bottom-[15%] w-[300px] h-[350px] z-40 opacity-40 pointer-events-none animate-player-fade">
                    <svg viewBox="0 0 200 200" className="w-full h-full fill-[#1a1a1a]">
                        <path d="M20,180 Q40,150 60,140 L100,120 Q120,110 140,115 L180,125 Q190,130 185,140 L150,170 Q140,180 120,180 Z" />
                        <path d="M100,120 Q90,105 105,95 L120,90 Q130,85 130,100 Z" />
                    </svg>
                </div>

                {/* 3. THE PREMIUM BILLIARD TABLE */}
                <div className="relative w-full h-[320px] bg-[#004d26] rounded-[40px] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.8)] border-[20px] border-[#382618] ring-1 ring-white/10 overflow-hidden">

                    {/* Table Details */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.3)_100%)]"></div>
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>

                    {/* Pockets */}
                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-black rounded-full shadow-inner"></div>
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-black rounded-full shadow-inner"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-black rounded-full shadow-inner"></div>
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-black rounded-full shadow-inner"></div>
                    <div className="absolute left-1/2 -top-5 -translate-x-1/2 w-16 h-10 bg-black rounded-b-full"></div>
                    <div className="absolute left-1/2 -bottom-5 -translate-x-1/2 w-16 h-10 bg-black rounded-t-full"></div>

                    {/* 4. THE PERFECT BREAK ACTION */}

                    {/* Cue Stick */}
                    <div className="absolute left-[-160px] top-1/2 -translate-y-1/2 w-[350px] h-3 bg-gradient-to-r from-[#2c1e14] via-[#8c6b4f] to-[#fff] rounded-r-full shadow-2xl animate-perfect-cue z-50">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-white rounded-full"></div>
                    </div>

                    {/* Cue Ball (Bi trắng) - Now sinks in middle pocket! */}
                    <div className="absolute left-24 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#fdfcf8] rounded-full shadow-lg animate-perfect-cue-ball z-30">
                        <div className="absolute top-1 left-2 w-2 h-2 bg-white rounded-full opacity-60"></div>
                    </div>

                    {/* The Rack of Balls */}
                    <div className="absolute left-[65%] top-1/2 -translate-y-1/2 w-2 h-2">
                        <div className="absolute w-8 h-8 bg-[#111] rounded-full shadow-lg animate-sink-8 flex items-center justify-center border border-white/5 z-20 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[6px] font-black text-black">8</div>
                        </div>
                        <div className="absolute w-8 h-8 bg-[#ffcc00] rounded-full shadow-lg animate-sink-1 flex items-center justify-center border border-white/5 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[6px] font-black text-black">1</div>
                        </div>
                        <div className="absolute w-8 h-8 bg-[#0044cc] rounded-full shadow-lg animate-sink-2 flex items-center justify-center border border-white/5 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[6px] font-black text-black">2</div>
                        </div>
                        <div className="absolute w-8 h-8 bg-[#cc0000] rounded-full shadow-lg animate-sink-3 flex items-center justify-center border border-white/5 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[6px] font-black text-black">3</div>
                        </div>
                        <div className="absolute w-8 h-8 bg-[#ffeb3b] rounded-full shadow-lg animate-sink-9 flex items-center justify-center border border-white/5 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[6px] font-black text-black">9</div>
                        </div>
                    </div>

                    {/* 5. BRAND REVEAL */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-[60] animate-brand-glow opacity-0 pointer-events-none">
                        <div className="flex flex-col items-center">
                            <h1 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-[-0.05em] italic drop-shadow-[0_10px_30px_rgba(0,0,0,1)] text-center">
                                Bống Coffee
                            </h1>

                            <div className="mt-4 flex items-center gap-4 text-[#c2a383] font-bold uppercase tracking-[0.6em] text-[10px] lg:text-xs">
                                <div className="w-8 h-[1px] bg-[#c2a383]/40"></div>
                                Sân Vườn & Billiards
                                <div className="w-8 h-[1px] bg-[#c2a383]/40"></div>
                            </div>

                            {/* Larger Coffee Cup */}
                            <div className="mt-8 flex items-center gap-2">
                                <i className="fas fa-mug-hot text-[#c2a383] text-4xl lg:text-5xl animate-bounce"></i>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
        @keyframes player-fade {
          0%, 100% { opacity: 0; transform: translateX(-20px); }
          10%, 30% { opacity: 0.4; transform: translateX(0); }
          40% { opacity: 0; transform: translateX(-10px); }
        }
        @keyframes perfect-cue {
          0% { transform: translate(-40px, -50%) rotate(-2deg); opacity: 0; }
          15% { transform: translate(0px, -50%) rotate(0deg); opacity: 1; }
          22% { transform: translate(50px, -50%); }
          35% { transform: translate(-100px, -50%); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes perfect-cue-ball {
          0%, 22% { transform: translate(0, -50%); opacity: 1; }
          30% { transform: translate(320px, -50%); }
          50% { transform: translate(350px, -150px) scale(0.5); opacity: 0; } /* Sinks in top-right pocket or similar */
          100% { opacity: 0; }
        }
        @keyframes sink-8 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-80px, 120px) rotate(720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-90px, 160px) scale(0.5); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-1 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(180px, -120px) rotate(720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(220px, -160px) scale(0.5); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-2 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-350px, 120px) rotate(-720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-380px, 160px) scale(0.5); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-3 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-350px, -120px) rotate(720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-380px, -160px) scale(0.5); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sink-9 {
          0%, 30% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(-80px, -120px) rotate(-720deg) scale(0.8); opacity: 1; }
          60% { transform: translate(-90px, -160px) scale(0.5); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes brand-glow {
          0%, 55% { opacity: 0; transform: scale(0.8); }
          70% { opacity: 1; transform: scale(1.1); }
          80% { transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-player-fade { animation: player-fade 6s infinite ease-in-out; }
        .animate-perfect-cue { animation: perfect-cue 6s infinite cubic-bezier(0.19, 1, 0.22, 1); }
        .animate-perfect-cue-ball { animation: perfect-cue-ball 6s infinite cubic-bezier(0.1, 0, 0.1, 1); }
        .animate-sink-8 { animation: sink-8 6s infinite cubic-bezier(0.165, 0.84, 0.44, 1); }
        .animate-sink-1 { animation: sink-1 6s infinite cubic-bezier(0.165, 0.84, 0.44, 1); }
        .animate-sink-2 { animation: sink-2 6s infinite cubic-bezier(0.165, 0.84, 0.44, 1); }
        .animate-sink-3 { animation: sink-3 6s infinite cubic-bezier(0.165, 0.84, 0.44, 1); }
        .animate-sink-9 { animation: sink-9 6s infinite cubic-bezier(0.165, 0.84, 0.44, 1); }
        .animate-brand-glow { animation: brand-glow 6s infinite ease-out; }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
