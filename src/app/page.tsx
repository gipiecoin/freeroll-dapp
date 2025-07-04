"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";

// --- Icon Components ---
const IconX = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconTelegram = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.88l-1.79 8.24c-.18.82-.69 1.02-1.35.64l-2.73-2.02-1.32 1.28c-.15.14-.28.28-.5.28l.19-2.82 5.1-4.63c.23-.21-.05-.33-.37-.12l-6.32 3.97-2.75-.85c-.83-.26-.85-.78.17-1.15l8.6-3.3c.64-.25 1.2.16.98.93z" />
  </svg>
);

const IconEmail = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

// --- Utility Components ---
const SocialLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-lg flex items-center gap-2">
    {children}
  </a>
);

const FeatureCard = ({
  icon,
  title,
  description,
  delay,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  href: string;
}) => (
  <a href={href} className="block h-full">
    <motion.div
      className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-xl border border-slate-700/60 text-center h-full flex flex-col items-center hover:border-teal-400/60 hover:bg-slate-700/60 transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="mb-4 flex items-center justify-center" style={{ width: "48px", height: "48px" }}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed flex-grow">{description}</p>
    </motion.div>
  </a>
);

const GenericInfoCard = ({
  title,
  description,
  delay,
}: {
  title: string;
  description: React.ReactNode;
  delay: number;
}) => (
  <motion.div
    className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-xl border border-slate-700/60 text-left shadow-md"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <div className="text-slate-300 text-sm leading-relaxed">{description}</div>
  </motion.div>
);

const FAQItem = ({
  question,
  answer,
  delay,
}: {
  question: string;
  answer: string;
  delay: number;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-lg p-5 rounded-xl border border-slate-700/60 shadow-md cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">{question}</h3>
        <motion.svg
          className={`w-5 h-5 text-teal-400 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </motion.svg>
      </div>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: isOpen ? 1 : 0, height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        {isOpen && <p className="text-slate-300 text-sm mt-3 pt-3 border-t border-slate-700/60">{answer}</p>}
      </motion.div>
    </motion.div>
  );
};

// --- Animation Styles ---
const animationStyles = `
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
  .particle:nth-child(2) { animation-delay: -0.5s; }
  .particle:nth-child(3) { animation-delay: -1s; }
  @keyframes spin-coin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes orbit {
    0% { transform: rotate(0deg) translateX(12px); opacity: 1; }
    50% { opacity: 0.5; }
    100% { transform: rotate(360deg) translateX(12px); opacity: 1; }
  }

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
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.2); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes radiate {
    0% { opacity: 0.3; height: 12px; }
    50% { opacity: 1; height: 16px; }
    100% { opacity: 0.3; height: 12px; }
  }

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
  .chart-bar:nth-child(2) { animation-delay: -0.3s; }
  .chart-bar:nth-child(3) { animation-delay: -0.6s; }
  @keyframes grow-bar {
    0% { height: 10px; }
    50% { height: 24px; }
    100% { height: 10px; }
  }

  .hero-text p, .card-text p, .info-text p {
    margin: 0.5rem 0;
    line-height: 1.5;
  }
`;

// --- Main Homepage Component ---
export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6 overflow-hidden">
      <style jsx global>{animationStyles}</style>

      {/* Background Visual Effects */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full filter blur-3xl opacity-50 animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-16 w-full max-w-5xl text-center px-6 py-12">
        {/* Hero Section */}
        <motion.div
          className="flex flex-col items-center gap-6 mt-16"
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
              width={144}
              height={144}
              className="drop-shadow-xl"
              priority
            />
          </motion.div>
          <motion.h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-sky-400"
            style={{ textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Claim FREE GipieCoin Every Day!
          </motion.h1>
          <motion.p
            className="max-w-2xl mx-auto text-lg md:text-xl text-slate-200 hero-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Start with no deposit. Enjoy risk-free entry! Win real GIPIE & USDC rewards every day. Join the GipieCoin ecosystem. Start your crypto journey today!
            <strong className="text-yellow-400">*Cryptocurrency involves risks—participate responsibly.*</strong>
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8, type: "spring", stiffness: 150 }}
          >
            <a href="/game">
              <button className="px-10 py-4 rounded-lg font-bold text-lg text-white bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl">
                Play Now
              </button>
            </a>
          </motion.div>
        </motion.div>

        <hr className="my-16 border-slate-700/60" />

        {/* Feature Cards Section */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={
              <div className="coin-container">
                <div className="coin" />
                <div className="particle" style={{ top: "50%", left: "50%" }} />
                <div className="particle" style={{ top: "50%", left: "50%" }} />
                <div className="particle" style={{ top: "50%", left: "50%" }} />
              </div>
            }
            title="Freeroll Game"
            description="Roll every hour to earn free GIPIE and crypto. Unlock bonus spins for a chance to win real USDC rewards."
            delay={1.4}
            href="/game"
          />
          <FeatureCard
            icon={
              <div className="starburst-container">
                <div className="starburst" />
                <div className="starburst-ray" style={{ transform: "rotate(0deg)" }} />
                <div className="starburst-ray" />
                <div className="starburst-ray" />
                <div className="starburst-ray" />
              </div>
            }
            title="Daily Claim"
            description="Claim FREE GIPIE every day. Boost your stack and upgrade your tier for bigger rewards."
            delay={1.6}
            href="/claimdaily"
          />
          <FeatureCard
            icon={
              <div className="chart-container">
                <div className="chart-bar" />
                <div className="chart-bar" />
                <div className="chart-bar" />
              </div>
            }
            title="Stake & Grow"
            description="Stake GIPIE and earn passive gains. Grow your crypto portfolio effortlessly."
            delay={1.8}
            href="/stake"
          />
        </div>

        <hr className="my-16 border-slate-700/60" />

        {/* About GipieCoin Section */}
        <div className="w-full">
          <motion.h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-green-400 mb-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.0 }}
          >
            About GipieCoin
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GenericInfoCard
              title="What is GipieCoin (GIPIE)?"
              description="GipieCoin (GIPIE) is a revolutionary cryptocurrency built on the Binance Smart Chain (BEP-20). Our core mission is to make crypto accessible and rewarding for everyone, regardless of their prior experience. We believe in financial inclusion through fun and risk-free earning opportunities. GipieCoin acts as the native utility token, powering all interactive features and rewards in our growing ecosystem."
              delay={2.2}
            />
            <GenericInfoCard
              title="Key Details"
              description={
                <span>
                  <strong>Token Name:</strong> GipieCoin<br />
                  <strong>Token Symbol:</strong> GIPIE<br />
                  <strong>Total Supply:</strong> Unlimited<br />
                  <strong>Blockchain:</strong> Binance Smart Chain (BSC) / BEP-20<br />
                  <strong>Primary Use Case:</strong> Earning rewards through Freeroll and Daily Claim, staking for passive income, and community participation.<br />
                  <strong>Current Phase:</strong> Actively developing and expanding a rewarding ecosystem for our community
                </span>
              }
              delay={2.4}
            />
          </div>
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.6 }}
          >
            <a
              href="/tokenomics"
              className="px-8 py-3 rounded-lg font-bold text-lg text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
            Read Our Tokenomics Here
            </a>
          </motion.div>
        </div>

        <hr className="my-16 border-slate-700/60" />

        {/* Roadmap Section */}
        <div className="w-full">
          <motion.h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 3.8 }}
          >
            Roadmap
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GenericInfoCard
              title="Q3 2025"
              description="Launch the Game feature with Freeroll, along with staking and daily claim to enhance user engagement. (Currently in progress as of July 2025)"
              delay={4.0}
            />
            <GenericInfoCard
              title="Q4 2025"
              description="Introduce the token swap feature and launch new features to improve functionality and user experience."
              delay={4.2}
            />
            <GenericInfoCard
              title="Q1 2026"
              description="Coming Soon..."
              delay={4.4}
            />
            <GenericInfoCard
              title="Q2 2026"
              description="Coming Soon..."
              delay={4.6}
            />
          </div>
        </div>

        <hr className="my-16 border-slate-700/60" />

        {/* FAQ Section */}
        <div className="w-full">
          <motion.h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-400 mb-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 5.2 }}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-4">
            <FAQItem
              question="How do I get started with GipieCoin?"
              answer="Connect your BSC-compatible Web3 wallet (like MetaMask) to our platform. Navigate to the 'Game' section to start earning GIPIE tokens instantly with Freeroll. No initial deposit is required!"
              delay={5.4}
            />
            <FAQItem
              question="Is GipieCoin truly free to earn?"
              answer="Yes, GipieCoin offers free earning opportunities through the Game (Freeroll) and Daily Claim features. These allow anyone to participate and earn crypto without upfront investment. USDC rewards are also available for bonus spins."
              delay={5.6}
            />
            <FAQItem
              question="How does staking work with GIPIE?"
              answer="Stake GIPIE tokens to earn passive income by locking them in our staking pools. This supports network security and stability, rewarding you with GIPIE. Higher staked amounts yield greater earnings."
              delay={5.8}
            />
            <FAQItem
              question="Where can I find the official GipieCoin contract address?"
              answer="The official GipieCoin (GIPIE) contract address is 0x03285a2f201ac1c00e51b77b0a55f139f3a7d591. Verify it on BscScan. Always double-check to avoid scams."
              delay={6.0}
            />
          </div>
        </div>

        <hr className="my-16 border-slate-700/60" />

        {/* Footer Section */}
        <footer className="w-full text-center py-10 border-t border-slate-700/60 mt-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 6.2 }}
          >
            <h3 className="text-2xl font-bold text-white mb-6">Connect With Us</h3>
            <div className="flex flex-wrap justify-center gap-6 mb-6">
              <SocialLink href="https://x.com/gipiecoin"><IconX /></SocialLink>
              <SocialLink href="https://t.me/gipiecoin"><IconTelegram /></SocialLink>
              <SocialLink href="mailto:dev@gipiecoin.xyz"><IconEmail /></SocialLink>
            </div>
            <p className="text-slate-300 text-base mt-4">
              Official Contract Address (BEP-20):<br />
              <a
                href="https://bscscan.com/address/0x03285a2f201ac1c00e51b77b0a55f139f3a7d591"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 font-mono"
              >
                GipieCoin Contract
              </a><br />
              © {new Date().getFullYear()} GipieCoin. All rights reserved.
            </p>
          </motion.div>
        </footer>
      </div>
    </main>
  );
}