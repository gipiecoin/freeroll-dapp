"use client";

// Note: 'next/image' is used for optimization. Ensure proper configuration if using a custom loader or CDN.
import { motion } from 'framer-motion';
import Image from 'next/image';
import React from 'react';

// --- Visual & Interactive Components ---

// 1. Background Sparkle Particles
const Sparkles = () => {
  const randomSparkle = () => ({
    id: Math.random(),
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    duration: Math.random() * 1.5 + 1.5,
    delay: Math.random() * 2,
    scale: Math.random() * 0.8 + 0.4,
  });

  const [sparkles] = React.useState(() => Array.from({ length: 30 }, randomSparkle));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {sparkles.map(({ id, top, left, duration, delay, scale }) => (
        <motion.div
          key={id}
          className="absolute rounded-full bg-white"
          style={{ top, left, width: '2px', height: '2px' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        />
      ))}
    </div>
  );
};

// 2. Feature Card Component
const FeatureCard = ({ icon, title, description, delay, href }: { icon: React.ReactNode; title: string; description: string; delay: number; href: string }) => (
  <a href={href} className="block h-full">
    <motion.div
      className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 text-center h-full flex flex-col items-center hover:border-teal-400/50 hover:bg-slate-700/50 transition-all duration-300 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="mb-4 flex items-center justify-center" style={{ width: '48px', height: '48px' }}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 flex-grow">{description}</p>
    </motion.div>
  </a>
);

// --- Main Homepage Component (Redesigned) ---
export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-black p-4 overflow-hidden">
      <style jsx global>{`
        /* Spinning Coin with Orbiting Particles (Freeroll) */
        .coin-container {
          position: relative;
          width: 32px;
          height: 32px;
        }
        .coin {
          width: 24px;
          height: 24px;
          background: radial-gradient(circle, #2dd4bf 40%, #4b6cb7 100%);
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: spin-coin 4s linear infinite;
        }
        .particle {
          width: 4px;
          height: 4px;
          background: #2dd4bf;
          border-radius: 50%;
          position: absolute;
          animation: orbit 2s linear infinite;
        }
        .particle:nth-child(2) {
          animation-delay: -0.5s;
        }
        .particle:nth-child(3) {
          animation-delay: -1s;
        }
        @keyframes spin-coin {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(12px);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: rotate(360deg) translateX(12px);
            opacity: 1;
          }
        }

        /* Starburst Effect (Guaranteed Daily Reward) */
        .starburst-container {
          position: relative;
          width: 32px;
          height: 32px;
        }
        .starburst {
          width: 24px;
          height: 24px;
          background: #2dd4bf;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse-star 2s ease-in-out infinite;
        }
        .starburst-ray {
          width: 2px;
          height: 12px;
          background: #2dd4bf;
          position: absolute;
          top: 50%;
          left: 50%;
          transform-origin: center 0;
          animation: radiate 2s ease-in-out infinite;
        }
        .starburst-ray:nth-child(2) {
          transform: rotate(45deg);
          animation-delay: -0.5s;
        }
        .starburst-ray:nth-child(3) {
          transform: rotate(90deg);
          animation-delay: -1s;
        }
        .starburst-ray:nth-child(4) {
          transform: rotate(135deg);
          animation-delay: -1.5s;
        }
        @keyframes pulse-star {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes radiate {
          0% {
            opacity: 0.3;
            height: 12px;
          }
          50% {
            opacity: 1;
            height: 16px;
          }
          100% {
            opacity: 0.3;
            height: 12px;
          }
        }

        /* Growing Bar Chart (Stake & Grow) */
        .chart-container {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
        }
        .chart-bar {
          width: 6px;
          background: #2dd4bf;
          animation: grow-bar 2s ease-in-out infinite;
        }
        .chart-bar:nth-child(2) {
          animation-delay: -0.3s;
        }
        .chart-bar:nth-child(3) {
          animation-delay: -0.6s;
        }
        @keyframes grow-bar {
          0% {
            height: 10px;
          }
          50% {
            height: 24px;
          }
          100% {
            height: 10px;
          }
        }
      `}</style>
      
      {/* Background visual effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '0s' }}></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <Sparkles />

      <div className="relative z-10 flex flex-col items-center justify-center gap-6 w-full max-w-4xl text-center px-4">
        
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Image
              src="/logo2.png"
              alt="GipieCoin Logo"
              width={128}
              height={128}
              className="drop-shadow-lg"
              priority
            />
          </motion.div>
          
          <motion.h1 
            className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-sky-400"
            style={{ textShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Claim FREE Crypto Every Hour!
          </motion.h1>

          <motion.p 
            className="max-w-2xl mx-auto mt-4 text-lg md:text-xl text-slate-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            No deposits, no risks. Just your chance to win real GIPIE & USDC rewards every 60 minutes. Ready to test your luck?
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8, type: "spring", stiffness: 150 }}
            className="mt-8"
          >
            <a href="/freeroll">
              <button className="px-10 py-4 rounded-full font-bold text-xl text-white bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl shadow-purple-500/30">
                Start Earning Now
              </button>
            </a>
          </motion.div>
        </motion.div>
        
        {/* Feature Cards Section */}
        <div className="mt-20 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={
              <div className="coin-container">
                <div className="coin"></div>
                <div className="particle" style={{ top: '50%', left: '50%' }}></div>
                <div className="particle" style={{ top: '50%', left: '50%' }}></div>
                <div className="particle" style={{ top: '50%', left: '50%' }}></div>
              </div>
            }
            title="Freeroll"
            description="Everyone can earn free GIPIE & crypto every hour! Get bonus spins with real money rewards like USDC!"
            delay={1.4}
            href="/freeroll"
          />
          <FeatureCard 
            icon={
              <div className="starburst-container">
                <div className="starburst"></div>
                <div className="starburst-ray" style={{ transform: 'rotate(0deg)' }}></div>
                <div className="starburst-ray"></div>
                <div className="starburst-ray"></div>
                <div className="starburst-ray"></div>
              </div>
            }
            title="Daily Claim"
            description="Claim FREE GIPIE daily! Boost your stack with daily claims! Upgrade your tier to increase daily claim rewards!"
            delay={1.6}
            href="/claimdaily"
          />
          <FeatureCard 
            icon={
              <div className="chart-container">
                <div className="chart-bar"></div>
                <div className="chart-bar"></div>
                <div className="chart-bar"></div>
              </div>
            }
            title="Stake & Grow"
            description="Stake GIPIE, earn passive gains! Grow your crypto fast!"
            delay={1.8}
            href="/stake"
          />
        </div>
      </div>
    </main>
  );
}