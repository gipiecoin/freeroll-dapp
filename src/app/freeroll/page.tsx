"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/walletContext";
import FreerollABI from "../abi/FreerollABI.json";
import BonusWheelABI from "../abi/BonusWheelABI.json";
import dynamic from "next/dynamic";

const BonusWheelModal = dynamic(() => import("../../components/BonusWheelModal"), {
  ssr: false,
});

const FREEROLL_CONTRACT_ADDRESS = "0x6FEE10F6277FB77a2BE5d450a28aC9785EC128b0"; 
const BONUS_WHEEL_CONTRACT_ADDRESS = "0xe1ED961c3Ab7D1E9c45ece28A3780Db889F6567E";
const BINANCE_EXPLORER_URL = "https://bscscan.com/tx/";
const DAPPS_BASE_URL = "https://gipiecoin.xyz";

type RollHistoryEntry = { roll: number; payout: string; timestamp: number };

const SkeletonLoader = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-700 animate-pulse rounded-md ${className}`} />
);

export default function Freeroll() {
  const { connected, provider, walletReady } = useWallet();
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [remainingTimeDisplay, setRemainingTimeDisplay] = useState<string>("Ready!");
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [animatedRoll, setAnimatedRoll] = useState<number | null>(null);
  const [payout, setPayout] = useState<string>("0");
  const [rollHistory, setRollHistory] = useState<RollHistoryEntry[]>([]);
  const [dailyRollCount, setDailyRollCount] = useState<number>(0);
  const [isBonusEligible, setIsBonusEligible] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [bonusPrizeIndex, setBonusPrizeIndex] = useState<number | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingTx, setIsProcessingTx] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{ hash: string | null; status: "pending" | "success" | "failed" | null }>({ hash: null, status: null });
  const [showBonusGame, setShowBonusGame] = useState<boolean>(true);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rollAnimationRef = useRef<NodeJS.Timeout | null>(null);

  const canRoll = connected && !isLoading && !isProcessingTx && cooldownSeconds <= 0;
  const canClaim = connected && !isLoading && !isProcessingTx && parseFloat(payout) > 0;
  const canSpin = isBonusEligible && !isProcessingTx && bonusPrizeIndex === null;

  const showMessage = useCallback((msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 3500); }, []);
  const formatTime = useCallback((seconds: number): string => { if (seconds <= 0) return "Ready!"; const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60); return `${h}h ${m}m ${s}s`; }, []);

  const updateRollHistory = useCallback(async () => {
    if (!provider) return;
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const freerollContract = new ethers.Contract(FREEROLL_CONTRACT_ADDRESS, FreerollABI, signer);
    const [newRoll, newPayoutValue] = await freerollContract.getUserRollInfo(address);
    const newEntry = { roll: Number(newRoll), payout: ethers.formatUnits(newPayoutValue, 18), timestamp: Date.now() };
    const storedHistory = localStorage.getItem(`rollHistory_${address}`);
    let history: RollHistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];
    history.unshift(newEntry);
    history = history.slice(0, 3);
    setRollHistory(history);
    localStorage.setItem(`rollHistory_${address}`, JSON.stringify(history));
  }, [provider]);

  const checkStatus = useCallback(async () => {
    if (!connected || !provider) { setIsLoading(false); return; }
    setIsLoading(true);
    setResetMessage(null);
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const freerollContract = new ethers.Contract(FREEROLL_CONTRACT_ADDRESS, FreerollABI, signer);
      const bonusWheelContract = new ethers.Contract(BONUS_WHEEL_CONTRACT_ADDRESS, BonusWheelABI, signer);

      const storedHistory = localStorage.getItem(`rollHistory_${address}`);
      if (storedHistory) setRollHistory(JSON.parse(storedHistory));

      const [lastClaimed, userInfo, userDailyRolls, lastRollTimestamp, eligible, lastSpinDay] = await Promise.all([
        freerollContract.lastClaimed(address),
        freerollContract.getUserRollInfo(address),
        freerollContract.dailyRollCount(address),
        freerollContract.lastRollTimestamp(address),
        freerollContract.isEligibleForBonus(address),
        bonusWheelContract.lastBonusSpinDay(address),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const currentDay = Math.floor(now / 86400);
      const hasSpunToday = Number(lastSpinDay) === currentDay;
      setShowBonusGame(!hasSpunToday);

      const lastRollDayValue = Math.floor(Number(lastRollTimestamp) / 86400);
      const currentDailyRolls = Number(userDailyRolls);

      setDailyRollCount(currentDailyRolls);
      setIsBonusEligible(eligible);

      if (showBonusGame && currentDay > lastRollDayValue && currentDailyRolls > 0) {
        setResetMessage("Roll once to reset your daily progress and start a new bonus round!");
      }

      const cooldownPeriodSeconds = 3600;
      const currentCooldown = Number(lastClaimed) > 0 ? (Number(lastClaimed) + cooldownPeriodSeconds) - now : 0;
      setCooldownSeconds(currentCooldown > 0 ? currentCooldown : 0);

      const [rollNumber, payoutValue] = userInfo;
      setLastRoll(Number(rollNumber) > 0 ? Number(rollNumber) : null);
      setPayout(Number(rollNumber) > 0 ? ethers.formatUnits(payoutValue, 18) : "0");

    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Failed to check status:", err);
        showMessage("Error fetching data from contracts.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [connected, provider, showMessage, showBonusGame]);

  const startRollAnimation = useCallback(() => {
    if (rollAnimationRef.current) clearInterval(rollAnimationRef.current);
    let speed = 100;
    const deceleration = 1.05;
    rollAnimationRef.current = setInterval(() => {
      const newRoll = Math.floor(Math.random() * 10001);
      setAnimatedRoll(newRoll);
      speed *= deceleration;
      if (speed > 1000) speed = 1000;
    }, speed);
  }, []);

  const stopRollAnimation = useCallback((targetRoll: number) => {
    if (rollAnimationRef.current) {
      clearInterval(rollAnimationRef.current);
      rollAnimationRef.current = null;
      setAnimatedRoll(targetRoll);
      setLastRoll(targetRoll);
    }
  }, []);

  useEffect(() => {
    if (walletReady) checkStatus();
    else setIsLoading(true);
  }, [walletReady, checkStatus]);

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
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [connected, cooldownSeconds, walletReady, checkStatus]);

  useEffect(() => {
    setRemainingTimeDisplay(formatTime(cooldownSeconds));
  }, [cooldownSeconds, formatTime]);

  useEffect(() => {
    if (isBonusEligible && !isModalOpen && bonusPrizeIndex === null) setIsModalOpen(true);
  }, [isBonusEligible, isModalOpen, bonusPrizeIndex]);

  const handleTransaction = async (txPromise: Promise<ethers.ContractTransactionResponse>, successMessage: string, failureMessage: string) => {
    setIsProcessingTx(true);
    setTxStatus({ hash: null, status: "pending" });
    showMessage("Sending transaction...");
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        const errorWithTransaction = err as Error & { transactionHash?: string };
        setTxStatus({ hash: errorWithTransaction.transactionHash || null, status: "failed" });
        showMessage(failureMessage);
        console.error("Transaction Error:", err);
      }
      return null;
    } finally {
      setIsProcessingTx(false);
    }
  };

  const handleRoll = async () => {
    if (!canRoll || !provider) return;
    startRollAnimation();
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(FREEROLL_CONTRACT_ADDRESS, FreerollABI, signer);
    const receipt = await handleTransaction(contract.roll(), "Roll successful!", "Roll Failed.");
    if (receipt) {
      const [newRoll] = await contract.getUserRollInfo(await signer.getAddress());
      stopRollAnimation(Number(newRoll));
      await updateRollHistory();
      await checkStatus();
    } else {
      stopRollAnimation(0);
    }
  };

  const handleClaim = async () => {
    if (!canClaim || !provider) return;
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(FREEROLL_CONTRACT_ADDRESS, FreerollABI, signer);
    await handleTransaction(contract.claimReward(), "Reward claimed successfully!", "Claim Failed.");
    await checkStatus();
  };

  const handleBonusSpin = async (): Promise<number | null> => {
    if (!canSpin || !provider) return null;
    await checkStatus(); 
    if (!isBonusEligible) {
        showMessage("You are not eligible for a bonus spin.");
        return null;
    }
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(BONUS_WHEEL_CONTRACT_ADDRESS, BonusWheelABI, signer);
    const receipt = await handleTransaction(
        contract.spin({ gasLimit: 300000 }),
        "Spin transaction confirmed!",
        "Bonus Spin Failed."
    );
    if (receipt && receipt.status === 1) {
        const address = await signer.getAddress();
        const [prizeIdx] = await contract.getPendingPrize(address);
        if (prizeIdx !== undefined && prizeIdx >= 0 && prizeIdx < 12) {
            const finalPrizeIndex = Number(prizeIdx);
            setBonusPrizeIndex(finalPrizeIndex);
            return finalPrizeIndex;
        }
    }
    setBonusPrizeIndex(null);
    setIsModalOpen(false);
    return null;
  };

  const handleBonusClaim = async () => {
    if (!provider || bonusPrizeIndex === null) {
      showMessage("No bonus reward to claim!");
      return;
    }
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(BONUS_WHEEL_CONTRACT_ADDRESS, BonusWheelABI, signer);
    const receipt = await handleTransaction(
        contract.claim(),
        "Bonus reward claimed successfully!",
        "Bonus Claim Failed."
    );
    if (receipt) {
      await checkStatus(); 
    }
    setBonusPrizeIndex(null);
    setIsModalOpen(false); 
  };

  const handleShareToX = useCallback(() => {
    if (lastRoll && parseFloat(payout) > 0) {
      const tweetText = encodeURIComponent(`I rolled ${lastRoll.toString().padStart(5, "0")} & won ${payout} Gipiecoin on GIPIE Freeroll! 🍀 Try your luck:`);
      const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(DAPPS_BASE_URL + "/freeroll")}`;
      window.open(tweetUrl, "_blank");
    } else {
      showMessage("You need a winning roll to share!");
    }
  }, [lastRoll, payout, showMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center py-12 px-4">
      <style jsx>{`
        @keyframes blur-fade-in-out { 0% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } 10% { opacity: 1; filter: blur(0); transform: translateY(0); } 90% { opacity: 1; filter: blur(0); transform: translateY(0); } 100% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } }
        .animate-blur-fade { animation: blur-fade-in-out 3.5s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-in; }
      `}</style>

      <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl max-w-lg w-full text-white border border-gray-700">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-2 drop-shadow-lg">Freeroll</h1>
          <p className="text-gray-300 text-lg">Roll every hour to win free GIPIE tokens!</p>
        </div>

        <div className="mb-6">
          <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900/60 shadow-inner">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-teal-300 uppercase bg-gray-800/80">
                <tr className="border-b border-gray-700/50">
                  <th scope="col" className="px-4 py-2 font-semibold">Lucky Number</th>
                  <th scope="col" className="px-4 py-2 font-semibold text-right">Payout (GIPIE)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { range: "10000", payout: "100", jackpot: true }, { range: "9998 - 9999", payout: "10" },
                  { range: "9994 - 9997", payout: "1" }, { range: "9986 - 9993", payout: "0.1" },
                  { range: "9886 - 9985", payout: "0.05" }, { range: "0 - 9885", payout: "0.01" },
                ].map((tier) => (
                  <tr key={tier.range} className={`border-b border-gray-700/50 last:border-b-0 ${tier.jackpot ? "bg-yellow-500/20" : "hover:bg-gray-700/50"}`}>
                    <td className={`px-4 py-2 font-mono ${tier.jackpot ? "font-bold text-yellow-300" : ""}`}>
                      {tier.range}
                      {tier.jackpot && (<span className="ml-2 text-xs font-bold text-yellow-400 animate-pulse">[JACKPOT]</span>)}
                    </td>
                    <td className={`px-4 py-2 font-mono text-right ${tier.jackpot ? "font-bold text-yellow-300" : ""}`}>
                      {tier.payout}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {lastRoll !== null && (
          <div className="mb-6 p-5 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-800 rounded-lg shadow-lg text-center border border-purple-600">
            <p className="text-sm text-purple-200">Your Last Roll</p>
            <div className="text-4xl font-bold text-white my-1">
              <span className="text-yellow-300 animate-pulse">
                {isLoading || animatedRoll === null ? <SkeletonLoader className="h-10 w-32 mx-auto" /> : animatedRoll.toString().padStart(5, "0")}
              </span>
            </div>
            {parseFloat(payout) > 0 ? (
              <p className="text-lg font-semibold text-green-300 mb-3">You won <span className="font-bold">{payout} GIPIE</span>!</p>
            ) : (
              <p className="text-lg font-semibold text-gray-400 mb-3">No reward. Better luck next time!</p>
            )}
            {parseFloat(payout) > 0 && (<button onClick={handleShareToX} className="px-5 py-2 rounded-full text-white font-bold text-sm transition-all bg-sky-500 hover:bg-sky-600">Share on 𝕏</button>)}
          </div>
        )}

        {rollHistory.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Your Recent Rolls</h3>
            <div className="space-y-2 bg-gray-900/50 p-3 rounded-lg">
              {rollHistory.map((entry) => (
                <div key={entry.timestamp} className="flex justify-between items-center text-sm p-2 bg-gray-800 rounded-md">
                  <span className="font-mono text-gray-400">Rolled: <span className="font-bold text-white">{entry.roll.toString().padStart(5, "0")}</span></span>
                  <span className={`font-bold ${parseFloat(entry.payout) > 0 ? "text-green-400" : "text-gray-500"}`}>
                    {parseFloat(entry.payout) > 0 ? `+${entry.payout} GIPIE` : "No Win"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900/50 p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4 text-lg">
            <span className="font-medium text-gray-300">Next Roll In:</span>
            <span className="font-bold text-yellow-300">{isLoading ? <SkeletonLoader className="h-6 w-28" /> : remainingTimeDisplay}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={handleRoll} disabled={!canRoll} className="py-3 px-4 rounded-lg font-bold text-xl transition-all bg-gradient-to-r from-blue-500 to-purple-600 text-white enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50">
              {isProcessingTx ? "Processing..." : "ROLL!"}
            </button>
            <button onClick={handleClaim} disabled={!canClaim} className="py-3 px-4 rounded-lg font-bold text-xl transition-all bg-gradient-to-r from-green-500 to-teal-500 text-white enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50">
              {isProcessingTx ? "Processing..." : parseFloat(payout) > 0 ? `Claim ${payout} GIPIE` : "No Reward"}
            </button>
          </div>
        </div>

        {showBonusGame && (
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-700">
            <h2 className="text-2xl font-bold text-center text-purple-400 mb-4">Daily Bonus Game</h2>
            {isLoading ? <SkeletonLoader className="h-12 w-full" /> : (
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-base font-medium text-purple-300">Bonus Spin Progress</span>
                  {/* --- VISUAL CHANGE 1 --- */}
                  <span className="text-sm font-medium text-purple-300">{dailyRollCount >= 10 ? "10/10" : `${dailyRollCount}/10`} Rolls</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  {/* --- VISUAL CHANGE 2 --- */}
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(dailyRollCount, 10) / 10 * 100}%` }}></div>
                </div>
                {resetMessage && (
                  <div className="mt-3 text-center text-sm text-purple-200 bg-purple-900/60 p-2 rounded-md border border-purple-800 animate-fade-in">
                    <p>{resetMessage}</p>
                  </div>
                )}
                {isBonusEligible && (
                  <button onClick={() => setIsModalOpen(true)} className="mt-4 w-full py-3 px-4 rounded-lg font-bold text-xl transition-all bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 animate-fade-in" disabled={isProcessingTx}>
                    {isProcessingTx ? "Processing..." : "Spin Bonus"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {txStatus.hash && (
          <div className="mt-6 p-4 bg-gray-900/70 rounded-lg text-center">
            {txStatus.status === "pending" && <div className="flex items-center justify-center space-x-3 text-yellow-300"><svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span className="font-medium">Transaction Pending...</span></div>}
            {txStatus.status === "success" && <div className="flex items-center justify-center space-x-3 text-green-400"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="font-medium">Transaction Successful!</span></div>}
            {txStatus.status === "failed" && <div className="flex items-center justify-center space-x-3 text-red-500"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="font-medium">Transaction Failed.</span></div>}
            <a href={`${BINANCE_EXPLORER_URL}${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 underline block mt-3 text-sm">View on Bscscan</a>
          </div>
        )}
      </div>

      <BonusWheelModal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setBonusPrizeIndex(null);
            checkStatus();
        }}
        onSpin={handleBonusSpin}
        isProcessing={isProcessingTx}
        prizeIndex={bonusPrizeIndex}
        onClaim={handleBonusClaim}
      />

      {message && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl border border-gray-700 z-50 animate-blur-fade">
          <p className="text-base font-medium text-center">{message}</p>
        </div>
      )}
    </div>
  );
}