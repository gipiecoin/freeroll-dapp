"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/walletContext";
import DailySpinABI from "../abi/DailySpinABI.json";

const DAILY_SPIN_CONTRACT_ADDRESS = "0x7AC32180d38BcBfBDEe742d2923eeE48653fa72a";
const BINANCE_EXPLORER_URL = "https://bscscan.com/tx/";
const DAPPS_BASE_URL = "https://gipiecoin.xyz";

type SpinHistoryEntry = { prize: string; timestamp: number };

const SkeletonLoader = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-700 animate-pulse rounded-md ${className}`} />
);

const wheelData = [
  { label: 'Try Again ❌', reward: 0.0, color: '#333', textColor: '#EEE' },
  { label: '0.002 GIPIE', reward: 0.002, color: '#FFD700', textColor: '#222' },
  { label: '0.005 GIPIE', reward: 0.005, color: '#FFA500', textColor: '#222' },
  { label: '0.01 GIPIE', reward: 0.01, color: '#FF6347', textColor: '#EEE' },
  { label: '0.02 GIPIE', reward: 0.02, color: '#4CAF50', textColor: '#FFF' },
  { label: '0.03 GIPIE', reward: 0.03, color: '#00BFFF', textColor: '#FFF' },
  { label: '0.05 GIPIE', reward: 0.05, color: '#8A2BE2', textColor: '#FFF' },
  { label: '0.1 GIPIE', reward: 0.1, color: '#FF1493', textColor: '#FFF' }
];

const WheelSVG = memo(({ spinRotation }: { spinRotation: number }) => {
  const [wheelSize, setWheelSize] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setWheelSize(Math.min(window.innerWidth * 0.85, 300));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (wheelSize === null) {
    return <div className="w-full h-[300px] flex items-center justify-center"><SkeletonLoader className="w-[300px] h-[300px] rounded-full" /></div>;
  }

  return (
    <svg
      className="wheel"
      style={{ transform: `rotate(${spinRotation}deg)` }}
      width={wheelSize}
      height={wheelSize}
      viewBox="0 0 400 400"
    >
      <circle cx="200" cy="200" r="195" fill="none" stroke="#FFD700" strokeWidth="6" filter="url(#goldGlow)" />
      <circle cx="200" cy="200" r="185" fill="#2a303a" stroke="#61dafb" strokeWidth="2" />
      <defs>
        {wheelData.map((prize, i) => (
          <linearGradient key={`grad-${i}`} id={`segmentGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={prize.color} />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
        ))}
        <filter id="goldGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 1 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {wheelData.map((prize, i) => {
        const anglePerSegment = 360 / wheelData.length;
        const startAngle = i * anglePerSegment;
        const endAngle = (i + 1) * anglePerSegment;
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        const x1 = 200 + 185 * Math.cos(startRad);
        const y1 = 200 + 185 * Math.sin(startRad);
        const x2 = 200 + 185 * Math.cos(endRad);
        const y2 = 200 + 185 * Math.sin(endRad);

        let currentTextRadius = 185 * 0.75;
        let currentFontSize = 15;
        if (prize.label.includes('Try Again')) {
          currentTextRadius = 185 * 0.65;
          currentFontSize = 12;
        }

        const textAngle = (startAngle + endAngle) / 2;
        const textX = 200 + currentTextRadius * Math.cos((textAngle - 90) * Math.PI / 180);
        const textY = 200 + currentTextRadius * Math.sin((textAngle - 90) * Math.PI / 180);

        return (
          <g key={i}>
            <path
              d={`M200,200 L${x1},${y1} A185,185 0 0,1 ${x2},${y2} Z`}
              fill={`url(#segmentGrad-${i})`}
              stroke="#000"
              strokeWidth="2"
            />
            <text
              x={textX}
              y={textY}
              fill={prize.textColor}
              fontSize={currentFontSize}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${textAngle + 90} ${textX} ${textY})`}
            >
              {prize.label}
            </text>
          </g>
        );
      })}
      {/* Tambahan teks "SPIN" di tengah roda */}
      <text
        x="200"
        y="200"
        fill="#FFD700"
        fontSize="40"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        filter="url(#goldGlow)"
      >
        SPIN
      </text>
      <circle cx="200" cy="200" r="55" fill="#222" stroke="#FFD700" strokeWidth="4" filter="url(#goldGlow)" />
    </svg>
  );
});

WheelSVG.displayName = 'WheelSVG';

export default function DailySpin() {
  const { connected, provider, walletReady } = useWallet();
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [remainingTimeDisplay, setRemainingTimeDisplay] = useState<string>("Ready!");
  const [lastSpinResultLabel, setLastSpinResultLabel] = useState<string | null>(null);
  const [pendingRewards, setPendingRewards] = useState<number>(0.00);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingTx, setIsProcessingTx] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{ hash: string | null; status: "pending" | "success" | "failed" | null }>({ hash: null, status: null });
  const [spinHistory, setSpinHistory] = useState<SpinHistoryEntry[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const [spinRotation, setSpinRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const spinAnimationRef = useRef<number | null>(null);
  const dailySpinCooldownSeconds = 86400; // 24 hours

  const canSpin = connected && !isLoading && !isProcessingTx && cooldownSeconds <= 0 && !isSpinning;
  const canClaim = connected && !isLoading && !isProcessingTx && pendingRewards > 0;

  const showMessage = useCallback((msg: string, duration: number = 3500) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "Ready!";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    return `${h}h ${m}m ${s}s`;
  }, []);
  
  const updateSpinHistory = useCallback(async (prizeLabel: string) => {
    if (!provider) return;
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const newEntry = { prize: prizeLabel, timestamp: Date.now() };
    const storedHistory = localStorage.getItem(`spinHistory_${address}`);
    let history: SpinHistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];
    history.unshift(newEntry);
    history = history.slice(0, 3);
    setSpinHistory(history);
    localStorage.setItem(`spinHistory_${address}`, JSON.stringify(history));
  }, [provider]);

  const checkStatus = useCallback(async () => {
    if (!connected || !provider) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = new ethers.Contract(DAILY_SPIN_CONTRACT_ADDRESS, DailySpinABI, signer);

      const [lastSpinTimestamp, pendingRewardsValue] = await contract.getUserSpinInfo(address);
      const storedHistory = localStorage.getItem(`spinHistory_${address}`);
      if (storedHistory) setSpinHistory(JSON.parse(storedHistory));

      const now = Math.floor(Date.now() / 1000);
      const currentCooldown = lastSpinTimestamp > 0 ? Number(lastSpinTimestamp) + dailySpinCooldownSeconds - now : 0;
      
      const newPendingRewards = pendingRewardsValue > 0 ? parseFloat(ethers.formatEther(pendingRewardsValue)) : 0.00;
      setCooldownSeconds(currentCooldown > 0 ? currentCooldown : 0);
      setPendingRewards(newPendingRewards);

    } catch {
      showMessage("Error fetching data from contracts.");
    } finally {
      setIsLoading(false);
    }
  }, [connected, provider, showMessage]);

  const handleTransaction = useCallback(async (txPromise: Promise<ethers.ContractTransactionResponse>, successMessage: string) => {
    setIsProcessingTx(true);
    setTxStatus({ hash: null, status: "pending" });
    showMessage("Submitting transaction...");
    try {
      const tx = await txPromise;
      setTxStatus({ hash: tx.hash, status: "pending" });
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        setTxStatus({ hash: tx.hash, status: "success" });
        showMessage(successMessage);
        return receipt;
      } else {
        throw new Error("Transaction failed on chain");
      }
    } catch {
      setTxStatus({ hash: null, status: "failed" });
      showMessage("Transaction failed.");
      return null;
    } finally {
      setIsProcessingTx(false);
    }
  }, [setTxStatus, setIsProcessingTx, showMessage]);

  const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

  const animateSpin = (start: number, end: number, duration: number, callback?: () => void) => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = easeOutQuint(progress);
      const newRotation = start + (end - start) * easedProgress;
      setSpinRotation(newRotation);

      if (progress < 1) {
        spinAnimationRef.current = requestAnimationFrame(animate);
      } else {
        spinAnimationRef.current = null;
        if (callback) callback();
      }
    };
    spinAnimationRef.current = requestAnimationFrame(animate);
  };
  
  const handleSpin = useCallback(async () => {
    if (!canSpin || !provider) {
        if (cooldownSeconds > 0) showMessage(`Wait ${remainingTimeDisplay} for the next spin!`);
        else if (isSpinning) showMessage("The wheel is already spinning!");
        return;
    }

    setLastSpinResultLabel(null);
    setIsProcessingTx(true);
    setIsSpinning(true);
    showMessage("Spinning... Hold tight!", 3000);

    const fastSpinDurationMs = 2000;
    const currentRotation = spinRotation;
    const fastSpinEnd = currentRotation + 1800;
    animateSpin(currentRotation, fastSpinEnd, fastSpinDurationMs);

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(DAILY_SPIN_CONTRACT_ADDRESS, DailySpinABI, signer);

    try {
        const receipt = await handleTransaction(
            contract.spin({ gasLimit: 300000 }),
            "Spin transaction confirmed!",
        );

        if (receipt && receipt.status === 1) {
            if (spinAnimationRef.current) {
                cancelAnimationFrame(spinAnimationRef.current);
            }
            
            const prizeIdx = await contract.getPrize(await signer.getAddress());
            const finalPrizeIndex = Number(prizeIdx);
            const wonPrize = wheelData[finalPrizeIndex];

            const anglePerSegment = 360 / wheelData.length;
            const targetAngle = 360 - (finalPrizeIndex * anglePerSegment + anglePerSegment / 2);
            
            const finalRotation = Math.floor(spinRotation / 360) * 360 + 1080 + targetAngle; 
            
            const slowSpinDurationMs = 8000;
            animateSpin(spinRotation, finalRotation, slowSpinDurationMs, async () => {
                setIsSpinning(false);
                setLastSpinResultLabel(wonPrize.label);
                
                await checkStatus();
                
                if (wonPrize.reward > 0) {
                    showMessage(`You won ${wonPrize.reward} GIPIE! 🎉`);
                } else {
                    showMessage("Try Again! You didn't win a prize this time. 😞");
                }
                updateSpinHistory(wonPrize.label);
            });
        } else {
            setIsSpinning(false);
            setIsProcessingTx(false);
            await checkStatus();
        }
    } catch {
        showMessage("An error occurred during the spinning process. Please try again.");
        setIsSpinning(false);
        setIsProcessingTx(false);
        await checkStatus();
    }
  }, [canSpin, cooldownSeconds, isSpinning, remainingTimeDisplay, showMessage, handleTransaction, provider, checkStatus, spinRotation, updateSpinHistory]);


  const handleClaim = useCallback(async () => {
    if (!canClaim || !provider) return;
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(DAILY_SPIN_CONTRACT_ADDRESS, DailySpinABI, signer);
    setIsProcessingTx(true);
    showMessage("Claiming rewards...");

    try {
      const tx = await contract.claim({ gasLimit: 100000 });
      setTxStatus({ hash: tx.hash, status: "pending" });
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setTxStatus({ hash: tx.hash, status: "success" });
        showMessage("Prize successfully claimed!");
        await checkStatus();
      } else {
        throw new Error("Claim transaction failed on chain");
      }
    } catch {
      setTxStatus({ hash: null, status: "failed" });
      showMessage("Claim failed.");
    } finally {
      setIsProcessingTx(false);
    }
  }, [canClaim, provider, checkStatus, showMessage]);

  const handleShareToX = useCallback(() => {
    if (lastSpinResultLabel) {
      const wonPrize = wheelData.find(d => d.label === lastSpinResultLabel);
      const winAmount = wonPrize && wonPrize.reward > 0 ? ` & won ${wonPrize.reward} GIPIE!` : ` and got ${lastSpinResultLabel}`;
      const tweetText = encodeURIComponent(
        `I just spun the Gipiecoin Daily Wheel${winAmount} 🍀 Try your luck #Gipiecoin #DailySpin #Crypto #Giveaway 👉🏻:`
      );
      const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(DAPPS_BASE_URL + "/spin")}`;
      window.open(tweetUrl, "_blank");
    } else {
      showMessage("You need to spin the wheel first to share!");
    }
  }, [lastSpinResultLabel, showMessage]);

  useEffect(() => {
    const handleWalletChange = async () => {
        if (walletReady && provider) {
            try {
                setSpinRotation(0);
                setLastSpinResultLabel(null);
                setSpinHistory([]);
                await checkStatus();
            } catch {
                setSpinRotation(0);
                setLastSpinResultLabel(null);
                setSpinHistory([]);
                setPendingRewards(0);
                setCooldownSeconds(0);
            }
        } else {
            setIsLoading(true);
            setSpinRotation(0);
            setLastSpinResultLabel(null);
            setSpinHistory([]);
            setPendingRewards(0);
            setCooldownSeconds(0);
        }
    };
    handleWalletChange();
  }, [walletReady, provider, checkStatus]);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (walletReady && connected && cooldownSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            checkStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [connected, cooldownSeconds, walletReady, checkStatus]);

  useEffect(() => {
    setRemainingTimeDisplay(formatTime(cooldownSeconds));
  }, [cooldownSeconds, formatTime]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex flex-col items-center justify-start py-4 px-2 sm:px-4">
      <style jsx>{`
        @keyframes blur-fade-in-out {
          0% { opacity: 0; filter: blur(5px); transform: translateY(-10px); }
          10% { opacity: 1; filter: blur(0); transform: translateY(0); }
          90% { opacity: 1; filter: blur(0); transform: translateY(0); }
          100% { opacity: 0; filter: blur(5px); transform: translateY(-10px); }
        }
        .animate-blur-fade { animation: blur-fade-in-out 3.5s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-in; }
        .wheel-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }
        .wheel-container {
          position: relative;
          max-width: 300px;
          height: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));
        }
        .wheel {
          transform-origin: center center;
          transition-property: transform;
          transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
        }
        .pointer {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 25px solid #FFD700;
          z-index: 10;
          filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5));
        }
        .pointer::after {
          content: '';
          position: absolute;
          top: -3px;
          left: -12px;
          width: 24px;
          height: 8px;
          background-color: #FFD700;
          border-radius: 50%;
          filter: blur(3px);
        }
        @media (min-width: 640px) {
          .wheel-container {
            max-width: 420px;
          }
          .pointer {
            top: -25px;
            border-top-width: 45px;
            border-left-width: 20px;
            border-right-width: 20px;
          }
          .pointer::after {
            top: -5px;
            left: -20px;
            width: 40px;
            height: 15px;
          }
        }
      `}</style>
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-2 drop-shadow-lg">Daily Spin</h1>
          <p className="text-gray-300 text-sm sm:text-lg">Spin daily to win free GIPIE tokens!</p>
        </div>

        <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg p-3 sm:p-6 rounded-2xl shadow-2xl w-full max-w-lg text-white border border-gray-700">
          <div className="mb-4 sm:mb-6 p-3 sm:p-5 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-800 rounded-lg shadow-lg text-center border border-purple-600">
            <div className="wheel-wrapper">
              <div className="wheel-container">
                <WheelSVG spinRotation={spinRotation} />
                <div className="pointer"></div>
              </div>
            </div>
            {lastSpinResultLabel && (
              <p className="text-lg sm:text-xl font-bold text-white my-1 sm:my-2">
                Result: <span className={`${(wheelData.find(d => d.label === lastSpinResultLabel)?.reward ?? 0) > 0 ? 'text-yellow-300' : 'text-gray-400'}`}>{lastSpinResultLabel}</span>
              </p>
            )}
            <button
              onClick={handleShareToX}
              className="mt-1 sm:mt-2 px-3 sm:px-5 py-1 sm:py-2 rounded-full text-white font-bold text-xs sm:text-sm transition-all bg-sky-500 hover:bg-sky-600"
            >
              Share on 𝕏
            </button>
          </div>

          {spinHistory.length > 0 && (
            <div className="mb-4 sm:mb-6 border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === "history" ? null : "history")}
                className="w-full p-2 sm:p-4 bg-gray-800 bg-opacity-80 hover:bg-opacity-90 flex justify-between items-center text-left"
              >
                <span className="font-semibold text-teal-300 text-sm sm:text-lg">Your Spin History</span>
                <svg
                  className={`h-4 sm:h-5 w-4 sm:w-5 text-gray-400 transition-transform ${openSection === "history" ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openSection === "history" && (
                <div className="p-2 sm:p-4 bg-gray-900/50 animate-fade-in">
                  <div className="space-y-1 sm:space-y-2">
                    {spinHistory.map((entry) => (
                      <div key={entry.timestamp} className="flex justify-between items-center text-xs sm:text-sm p-1 sm:p-2 bg-gray-800 rounded-md">
                        <span className="font-mono text-gray-400">
                          Prize: <span className="font-bold text-white">{entry.prize}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4 sm:mb-6 p-3 sm:p-5 bg-gradient-to-r from-teal-800 via-cyan-800 to-teal-800 rounded-lg shadow-lg text-center border border-teal-600">
            <p className="text-xs sm:text-sm text-teal-200">Your Pending Rewards</p>
            <div className="text-2xl sm:text-4xl font-bold text-white my-1">
              <span className="text-green-300 animate-pulse">
                {isLoading ? (
                  <SkeletonLoader className="h-8 w-24 mx-auto" />
                ) : (
                  `${
                    pendingRewards.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 5
                    })
                  } GIPIE`
                )}
              </span>
            </div>
            <p className="text-sm sm:text-lg font-semibold text-gray-300 mb-1 sm:mb-3">Collected from your spins</p>
          </div>

          <div className="mb-4 sm:mb-6 bg-gray-900/50 p-2 sm:p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2 sm:mb-4 text-sm sm:text-lg">
              <span className="font-medium text-gray-300">Next Spin In:</span>
              <span className="font-bold text-yellow-300">
                {isLoading ? <SkeletonLoader className="h-5 w-20" /> : remainingTimeDisplay}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <button
                onClick={handleSpin}
                disabled={!canSpin}
                className="py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-bold text-base sm:text-xl transition-all bg-gradient-to-r from-blue-500 to-purple-600 text-white enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessingTx ? "Processing..." : (isSpinning ? "Spinning..." : "SPIN!")}
              </button>
              <button
                onClick={handleClaim}
                disabled={!canClaim}
                className="py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-bold text-base sm:text-xl transition-all bg-gradient-to-r from-green-500 to-teal-500 text-white enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessingTx ? "Processing..." : (pendingRewards > 0 ? `Claim ${
                  pendingRewards.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 5
                  })
                } GIPIE` : "No Prizes")}
              </button>
            </div>
          </div>

          {txStatus.hash && (
            <div className="mt-4 sm:mt-6 p-2 sm:p-4 bg-gray-900/70 rounded-lg text-center">
              {txStatus.status === "pending" && (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-yellow-300">
                  <svg className="animate-spin h-4 sm:h-6 w-4 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span className="font-medium text-xs sm:text-base">Transaction is being processed...</span>
                </div>
              )}
              {txStatus.status === "success" && (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-green-400">
                  <svg className="h-4 sm:h-6 w-4 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-xs sm:text-base">Transaction Successful!</span>
                </div>
              )}
              {txStatus.status === "failed" && (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-red-500">
                  <svg className="h-4 sm:h-6 w-4 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-xs sm:text-base">Transaction Failed.</span>
                </div>
              )}
              {txStatus.hash && (
                <a
                  href={`${BINANCE_EXPLORER_URL}${txStatus.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-500 underline block mt-1 sm:mt-3 text-xs sm:text-sm"
                >
                  View on BSCscan
                </a>
              )}
            </div>
          )}

          {message && (
            <div className="fixed top-2 sm:top-5 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 sm:px-6 py-1 sm:py-3 rounded-lg shadow-xl border border-gray-700 z-50 animate-blur-fade">
              <p className="text-xs sm:text-base font-medium text-center">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}