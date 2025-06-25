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
const FeatureCard = ({ icon, title, description, delay, href }: { icon: string; title: string; description: string; delay: number; href: string }) => (
  <a href={href} className="block h-full">
    <motion.div
      className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 text-center h-full flex flex-col items-center hover:border-teal-400/50 hover:bg-slate-700/50 transition-all duration-300 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="text-4xl mb-4 text-teal-400">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 flex-grow">{description}</p>
    </motion.div>
  </a>
);

// --- Main Homepage Component (Redesigned) ---
export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-black p-4 overflow-hidden">
      
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
            icon="💰"
            title="Hourly Opportunity"
            description="Receive FREE GIPIE hourly! Grab USDC Bonus Spins with every play!"
            delay={1.4}
            href="/freeroll"
          />
          <FeatureCard 
            icon="🎁"
            title="Guaranteed Daily Reward"
            description="Claim FREE GIPIE daily! Boost your stack with daily claims!"
            delay={1.6}
            href="/claimdaily"
          />
          <FeatureCard 
            icon="🔒"
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