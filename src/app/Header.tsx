"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from "./context/walletContext";
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// --- Helper Functions & Icons ---
function useOnClickOutside(ref: React.RefObject<HTMLDivElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || (ref.current && ref.current.contains(event.target as Node))) return;
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

// --- Icons (Inline SVG) ---
const BnbIcon = () => <Image src="/bnb-icon.svg" alt="BNB Icon" width={24} height={24} />;
const GipieIcon = () => <Image src="/logo.png" alt="GipieCoin Logo" width={24} height={24} />;
const CopyIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const ExternalLinkIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;
const LogoutIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;


// --- Wallet Panel Sub-components ---
const WalletPanelHeader = ({ onClose }: { onClose: () => void }) => (
  <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold text-white">Wallet</h3>
      <p className="text-sm text-slate-400">BNB Smart Chain Network</p>
    </div>
    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full sm:hidden">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  </div>
);

const AddressInfo = ({ address, onCopy, copySuccess }: { address: string; onCopy: () => void; copySuccess: string; }) => (
  <div className="bg-slate-800 p-3 rounded-lg mb-4">
    <div className="text-xs text-slate-400 mb-1">Your Address</div>
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-sm text-white break-all">{address}</span>
      <button onClick={onCopy} className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0">
        {copySuccess ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <CopyIcon />}
      </button>
    </div>
  </div>
);

const BalanceList = ({ balance, ethBalance }: { balance: string, ethBalance: string }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
      <div className="flex items-center gap-3">
        <GipieIcon />
        <span className="text-base text-slate-200">GIPIE</span>
      </div>
      <span className="font-mono text-base text-white">{parseFloat(balance || "0").toFixed(4)}</span>
    </div>
    <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
      <div className="flex items-center gap-3">
        <BnbIcon />
        <span className="text-base text-slate-200">BNB</span>
      </div>
      <span className="font-mono text-base text-white">{parseFloat(ethBalance || "0").toFixed(4)}</span>
    </div>
  </div>
);

const ActionButtons = ({ address, onDisconnect }: { address: string; onDisconnect: () => void; }) => (
  <div className="p-4 border-t border-slate-700/50 space-y-2">
    <a href={`https://bscscan.com/address/${address}`} target="_blank" rel="noopener noreferrer" className="w-full h-10 flex items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white transition-colors">
      <ExternalLinkIcon />
      <span>View on BscScan</span>
    </a>
    <button onClick={onDisconnect} className="w-full h-10 flex items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 transition-colors" title="Disconnect Wallet">
      <LogoutIcon />
      <span>Disconnect</span>
    </button>
  </div>
);


export default function Header() {
  const { walletAddress, balance, ethBalance, disconnectWallet } = useWallet();
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(popoverRef, () => setIsBalanceVisible(false));
  useOnClickOutside(navRef, () => setIsNavOpen(false));
  
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

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
              <span className="hidden sm:inline text-xl font-bold text-white group-hover:text-green-400 transition-colors">GipieCoin</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/freeroll" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Freeroll</Link>
              <Link href="/claimdaily" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Daily Claim</Link>
              <Link href="/stake" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Stake</Link>
              <Link href="/tokenomics" className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Tokenomics</Link>
            </nav>
            <div className="md:hidden relative" ref={navRef}>
              <button onClick={() => setIsNavOpen(!isNavOpen)} className="h-10 flex items-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors px-4">
                <span>Menu</span>
                <ChevronDownIcon />
              </button>
              <AnimatePresence>
                {isNavOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 z-20">
                    <nav className="flex flex-col">
                      <Link href="/freeroll" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Freeroll</Link>
                      <Link href="/claimdaily" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Daily Claim</Link>
                      <Link href="/stake" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Stake</Link>
                      <Link href="/tokenomics" onClick={() => setIsNavOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white">Tokenomics</Link>
                    </nav>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="h-10 flex items-center gap-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 transition-colors">
              <Image src="/bnb-icon.svg" alt="BNB Icon" width={16} height={16} />
              <span className="hidden sm:inline">BNB Smart Chain</span>
            </button>
            
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                if (!connected) {
                  return <button onClick={openConnectModal} className="h-10 flex items-center justify-center px-4 rounded-full font-semibold text-sm text-white bg-gray-600 hover:bg-gray-700 transition-colors">Connect Wallet</button>;
                }
                return (
                  <div className="relative" ref={popoverRef}>
                    <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="h-10 flex items-center gap-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-mono px-3 transition-colors" title={walletAddress}>
                      <span>{truncateAddress(walletAddress)}</span>
                    </button>
                    <AnimatePresence>
                      {isBalanceVisible && (
                        <motion.div
                          variants={sliderVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ type: "spring", stiffness: 400, damping: 40 }}
                          className="fixed top-0 left-0 h-screen w-screen bg-gray-900/80 flex justify-end"
                        >
                          <div className="h-full w-full sm:w-80 bg-slate-900 shadow-2xl flex flex-col">
                            <WalletPanelHeader onClose={() => setIsBalanceVisible(false)} />
                            <div className="p-4 flex-grow">
                              <AddressInfo address={walletAddress} onCopy={handleCopyAddress} copySuccess={copySuccess} />
                              <BalanceList balance={balance} ethBalance={ethBalance} />
                            </div>
                            <ActionButtons address={walletAddress} onDisconnect={disconnectWallet} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}