"use client";

import Link from 'next/link';
import Image from 'next/image'; // Import the Image component
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-black p-4 overflow-hidden">
      <div className="relative w-full max-w-3xl text-center">
        
        {/* Background Glow Effect */}
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse"
          style={{ animationDelay: '0s' }}
        ></div>
        <div 
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>

        <motion.div 
          className="relative z-10 flex flex-col items-center justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Main Logo using Next.js Image component */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Image
              src="/logo2.png" // This path points to your /public/logo.svg file
              alt="GipieCoin Logo"
              width={128} // A good size for a hero logo (128x128 pixels)
              height={128}
              className="drop-shadow-lg"
              priority // Helps with loading performance
            />
          </motion.div>
          
          {/* Engaging Main Headline */}
          <motion.h1 
            className="text-4xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-sky-400"
            style={{ textShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Claim FREE Crypto Every Hour!
          </motion.h1>

          {/* Short Description */}
          <motion.p 
            className="max-w-xl text-lg md:text-xl text-slate-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            No deposits, no risks. Just your chance to win real GIPIE & USDC rewards every 60 minutes. Ready to test your luck?
          </motion.p>
          
          {/* Call-to-Action (CTA) Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8, type: "spring", stiffness: 150 }}
          >
            <Link href="/freeroll" passHref>
              <button className="px-10 py-4 rounded-full font-bold text-xl text-white bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl shadow-purple-500/30">
                Start Winning Now
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}