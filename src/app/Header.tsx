"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from "./context/walletContext";
import { motion, AnimatePresence } from 'framer-motion';

// Custom hook to detect clicks outside an element
function useOnClickOutside(ref: React.RefObject<HTMLDivElement | null>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// BNB Smart Chain Icon Component
const BnbIcon = () => ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0Z" fill="#F0B90B"/><path d="M8.49805 8.87988L12.001 5.37695L15.502 8.87988L13.751 10.6289L12.001 8.87988L10.25 10.6289L8.49805 8.87988Z" fill="white"/><path d="M6.375 11.003L8.12598 12.752L9.87305 11.003L8.12598 9.25195L6.375 11.003Z" fill="white"/><path d="M10.25 13.125L12.001 14.874L13.751 13.125L12.001 11.376L10.25 13.125Z" fill="white"/><path d="M14.127 11.003L15.8769 9.25195L17.625 11.003L15.8769 12.752L14.127 11.003Z" fill="white"/><path d="M8.49805 15.25L10.25 13.501L12.001 15.25L13.751 13.501L15.502 15.25L12.001 18.752L8.49805 15.25Z" fill="white"/></svg> );

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
  const popoverRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(popoverRef, () => setIsBalanceVisible(false));

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0 flex items-center gap-3 group">
                <Image src="/logo.png" alt="GipieCoin Logo" width={32} height={32} />
                <span className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">
                    GipieCoin
                </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/freeroll" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Freeroll</Link>
              <Link href="/claimdaily" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Daily Claim</Link>
              <Link href="/stake" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Stake</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* --- MODIFICATION 1: Network display is now static and non-clickable --- */}
            <div className="h-10 flex items-center gap-2 rounded-full bg-slate-800 text-white text-sm font-medium transition-colors pl-3 pr-4">
              <BnbIcon />
              <span className="whitespace-nowrap">BNB Chain</span>
            </div>
            
            {connected ? (
              <div className="relative" ref={popoverRef}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                        className="h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-mono px-4 transition-colors"
                        title={walletAddress}
                    >
                        {truncateAddress(walletAddress)}
                    </button>
                    <button
                        onClick={disconnectWallet}
                        className="h-10 flex items-center justify-center rounded-md px-4 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                        title="Disconnect Wallet"
                    >
                        Disconnect
                    </button>
                </div>
                
                <AnimatePresence>
                    {isBalanceVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute top-full right-0 mt-2 w-60 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-xl p-4 z-10"
                        >
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-slate-400">GIPIE Balance</span>
                                    <span className="text-white font-medium">{parseFloat(balance).toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-slate-400">BNB Balance</span>
                                    <span className="text-white font-medium">{parseFloat(ethBalance).toFixed(4)}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="h-10 flex items-center justify-center px-5 rounded-full font-semibold text-sm text-black bg-gradient-to-r from-green-300 to-teal-400 hover:opacity-90"
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