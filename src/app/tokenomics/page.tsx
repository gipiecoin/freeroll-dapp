"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Reusable Components for this page ---

// Accordion Component for clean structure
const AccordionSection = ({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) => (
  <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-5 flex items-center justify-between text-left text-xl font-semibold text-teal-300 hover:bg-slate-700/50 transition-colors"
    >
      <span className="flex-1">{title}</span>
      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="content"
          initial="collapsed"
          animate="open"
          exit="collapsed"
          variants={{
            open: { opacity: 1, height: 'auto', marginTop: 0, paddingBottom: '24px' },
            collapsed: { opacity: 0, height: 0, marginTop: -1, paddingBottom: 0 },
          }}
          transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          className="overflow-hidden"
        >
          <div className="px-5 text-gray-300 border-t border-slate-700/50 pt-5">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// New Progress Bar Component
const ProgressBar = ({ label, percentage }: { label: string, percentage: number }) => (
    <li className="space-y-2">
        <div className="flex justify-between text-sm">
            <span>{label}</span>
            <span className="font-mono text-teal-300">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
            <motion.div
                className="bg-gradient-to-r from-teal-400 to-green-400 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
            />
        </div>
    </li>
);

// --- Social Icons ---
const SocialLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-800/50 rounded-full text-slate-400 hover:text-teal-300 hover:bg-slate-700 transition-all duration-300">
        {children}
    </a>
);

const IconX = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const IconTelegram = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.88l-1.79 8.24c-.18.82-.69 1.02-1.35.64l-2.73-2.02-1.32 1.28c-.15.14-.28.28-.5.28l.19-2.82 5.1-4.63c.23-.21-.05-.33-.37-.12l-6.32 3.97-2.75-.85c-.83-.26-.85-.78.17-1.15l8.6-3.3c.64-.25 1.2.16.98.93z"/></svg>;
const IconEmail = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/></svg>;


// --- Main Tokenomics Component ---
export default function Tokenomics() {
  const [openSections, setOpenSections] = useState({
    distribution: true,
    dailyClaim: false,
    supplyInflation: false,
    onProgress: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 drop-shadow-lg">GIPIE Tokenomics</h1>
        <p className="text-lg mb-8 text-center text-gray-300">
          GIPIE is the utility token in our ecosystem, powering staking, freerolls, and daily claims. Here is an explanation of the token&apos;s distribution and supply mechanics.
        </p>

        <div className="space-y-4">
          <AccordionSection title="Minted Token Distribution" isOpen={openSections.distribution} onToggle={() => toggleSection('distribution')}>
            <p className="mb-4 text-gray-300">
              Our initial mint yielded 1 million GIPIE, allocated as follows to maintain a balanced ecosystem economy:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-200">
              <li>40% - Staking Rewards, encouraging long-term participation.</li>
              <li>20% - Community Freeroll prizes.</li>
              <li>10% - Community free spins.</li>
              <li>10% - Weekly Giveaways.</li>
              <li>10% - Liquidity Provision.</li>
              <li>10% - Operations and Development, supporting project growth.</li>
            </ul>
          </AccordionSection>

          <AccordionSection title="Daily Claim as a Minting Mechanism" isOpen={openSections.dailyClaim} onToggle={() => toggleSection('dailyClaim')}>
            <p className="text-gray-300">
              The daily claim is a feature where every user can mint new GIPIE tokens daily. This process contributes to the total token supply and is designed to incentivize the community, with the minted amount depending on smart contract rules.
            </p>
          </AccordionSection>

          <AccordionSection title="Total Supply and Inflation" isOpen={openSections.supplyInflation} onToggle={() => toggleSection('supplyInflation')}>
            <p className="text-gray-300">
              The initial supply of GIPIE is 1,000,000 tokens, with daily additions through the daily claim, which is controlled to maintain economic stability. Token inflation is monitored to ensure the value remains sustainable as the ecosystem grows.
            </p>
          </AccordionSection>
          
          <AccordionSection title="Development in Progress" isOpen={openSections.onProgress} onToggle={() => toggleSection('onProgress')}>
              <p className="mb-4 text-gray-300">
                We are actively developing new features to enhance the GIPIE ecosystem. Here&apos;s what we are currently working on:
              </p>
              <ul className="space-y-4">
                <ProgressBar label="New Game" percentage={10} />
                <ProgressBar label="GIPIE/BNB LP Staking" percentage={15} />
                <ProgressBar label="Swap" percentage={5} />
              </ul>
               <p className="mt-4 text-sm text-gray-400">Progress will be announced periodically. Stay tuned for our updates!</p>
          </AccordionSection>
        </div>

        <div className="mt-12 flex justify-center space-x-4">
          <SocialLink href="https://x.com/gipiecoin"><IconX /></SocialLink>
          <SocialLink href="https://t.me/gipiecoin"><IconTelegram /></SocialLink>
          <SocialLink href="mailto:dev@gipiecoin.xyz"><IconEmail /></SocialLink>
        </div>
      </div>
    </div>
  );
}
