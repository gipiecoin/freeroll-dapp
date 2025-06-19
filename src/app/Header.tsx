"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from "./context/walletContext";
import { motion, AnimatePresence } from 'framer-motion';

// Updated useOnClickOutside to accept RefObject<HTMLDivElement | null>
function useOnClickOutside(ref: React.RefObject<HTMLDivElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || (ref.current && ref.current.contains(event.target as Node))) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// Updated BNB Icon with image file
const BnbIcon = () => (
  <Image src="/bnb-icon.svg" alt="BNB Icon" width={16} height={16} />
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default function Header() {
  const {
    connected,
    walletAddress,
    balance,
    ethBalance,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(popoverRef, () => setIsBalanceVisible(false));
  useOnClickOutside(navRef, () => setIsNavOpen(false));

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const sliderVariants = {
    hidden: { x: "100%" },
    visible: { x: 0 },
    exit: { x: "100%" },
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" onClick={() => setIsNavOpen(false)} className="flex-shrink-0 flex items-center gap-3 group">
              <Image src="/logo.png" alt="GipieCoin Logo" width={32} height={32} />
              <span className="hidden sm:inline text-xl font-bold text-white group-hover:text-green-400 transition-colors">
                GipieCoin
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/freeroll" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Freeroll</Link>
              <Link href="/claimdaily" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Daily Claim</Link>
              <Link href="/stake" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Stake</Link>
            </nav>

            <div className="md:hidden relative" ref={navRef}>
              <button 
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="h-10 flex items-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors px-4"
              >
                <span>Menu</span>
                <ChevronDownIcon />
              </button>
              <AnimatePresence>
                {isNavOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 z-20"
                  >
                    <nav className="flex flex-col">
                      <Link href="/freeroll" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Freeroll</Link>
                      <Link href="/claimdaily" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Daily Claim</Link>
                      <Link href="/stake" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Stake</Link>
                    </nav>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="h-10 flex items-center gap-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 transition-colors">
              <BnbIcon />
              <span className="hidden sm:inline">BNB Smart Chain</span>
            </button>
            
            {connected ? (
              <div className="relative" ref={popoverRef}>
                <button
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                  className="h-10 flex items-center gap-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-mono px-3 transition-colors"
                  title={walletAddress}
                >
                  <span>{truncateAddress(walletAddress)}</span>
                </button>
                
                <AnimatePresence>
                  {isBalanceVisible && (
                    <motion.div
                      variants={sliderVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ type: "tween", duration: 0.3 }}
                      className="fixed top-16 right-0 h-[calc(100vh-64px)] w-64 bg-slate-800/90 backdrop-blur-md border-l border-slate-700 shadow-xl p-4 z-50"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">Wallet</h3>
                        <button
                          onClick={() => setIsBalanceVisible(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-400">GIPIE Balance</span>
                          <span className="text-white font-medium">{parseFloat(balance || "0").toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-400">BNB Balance</span>
                          <span className="text-white font-medium">{parseFloat(ethBalance || "0").toFixed(4)}</span>
                        </div>
                        <button
                          onClick={disconnectWallet}
                          className="w-full mt-4 h-10 flex items-center justify-center rounded-md px-3 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                          title="Disconnect Wallet"
                        >
                          Disconnect
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="h-10 flex items-center justify-center px-4 rounded-full font-semibold text-sm text-white bg-gray-600 hover:bg-gray-700 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}