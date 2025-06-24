"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/walletContext";
import TesterABI from "../abi/TesterABI.json"; // Assuming this ABI is for the GipieCoin contract now
import { motion, AnimatePresence } from 'framer-motion'; // Added for accordion animations

// --- Configuration ---
const CONTRACT_ADDRESS = "0x03285a2F201AC1c00E51b77b0A55F139f3A7D591"; 
const BINANCE_EXPLORER_URL = "https://bscscan.com//tx/";
const MIN_GIPIE_BALANCE_TO_CLAIM = 0.5; // Requirement is now for GIPIE

// --- Small Reusable Components ---
const SkeletonLoader = ({ className = "" }: { className?: string }) => (
    <div className={`bg-gray-700 animate-pulse rounded-md ${className}`} />
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <motion.svg key="chevron" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </motion.svg>
);

// --- Custom Error Type ---
interface EthersError extends Error {
    code?: string;
    reason?: string;
    transactionHash?: string;
}

// --- Main Component ---
export default function ClaimDaily() {
    const { connected, provider, walletReady, balance: gipieBalance, ethBalance } = useWallet(); // Renamed for clarity

    // --- State Management ---
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
    const [remainingTimeDisplay, setRemainingTimeDisplay] = useState<string>("Ready!");
    
    // Contract & User Data
    const [contractLocked, setContractLocked] = useState<boolean>(false);
    const [totalMinted, setTotalMinted] = useState<string>("0");
    const [userCurrentTier, setUserCurrentTier] = useState<number>(0);
    const [currentClaimAmount, setCurrentClaimAmount] = useState<string>("0.0");
    const [nextTierId, setNextTierId] = useState<number | null>(null);
    const [nextTierReward, setNextTierReward] = useState<string>("0.0");
    const [nextTierCostETH, setNextTierCostETH] = useState<string>("0.0");

    // UI & Transaction State
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isProcessingTx, setIsProcessingTx] = useState<boolean>(false);
    const [message, setMessage] = useState<string | null>(null);
    const [txStatus, setTxStatus] = useState<{ hash: string | null; status: "pending" | "success" | "failed" | null; }>({ hash: null, status: null });
    const [openAccordion, setOpenAccordion] = useState<string | null>('daily_claim'); // Changed from string to string | null
    
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- Derived Values ---
    const userGipieBalance = parseFloat(gipieBalance || "0");
    const userEthBalance = parseFloat(ethBalance || "0");
    const hasMinGipieForClaim = userGipieBalance >= MIN_GIPIE_BALANCE_TO_CLAIM;
    const parsedNextTierCostETH = parseFloat(nextTierCostETH) || 0;
    const canUpgrade = connected && nextTierId !== null && userEthBalance >= parsedNextTierCostETH;
    const canClaimDerived = connected && !contractLocked && cooldownSeconds <= 0;
    const showUpgradeSection = connected && !contractLocked && nextTierId !== null && hasMinGipieForClaim;
    
    // --- Logic Functions ---
    const showMessage = useCallback((msg: string) => { setMessage(msg); setTimeout(() => { setMessage(null); }, 3500); }, []);
    const formatTime = useCallback((seconds: number): string => { if (seconds <= 0) return "Ready!"; const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60); return `${h}h ${m}m ${s}s`; }, []);

    const checkClaimStatus = useCallback(async () => {
        if (!connected || !provider) { setIsLoading(false); return; }
        try {
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, TesterABI, signer);

            const [isLocked, totalSupply, currentTier, contractCooldownValue] = await Promise.all([
                contract.getLockStatus(),
                contract.totalSupply(),
                contract.getUserClaimTier(userAddress),
                contract.getRemainingCooldown(userAddress)
            ]);
            
            setContractLocked(isLocked);
            setTotalMinted(ethers.formatUnits(totalSupply, 18));
            setCooldownSeconds(Number(contractCooldownValue));

            const currentTierNum = Number(currentTier);
            setUserCurrentTier(currentTierNum);

            const [dailyRewardAmount] = await contract.getClaimTierConfig(currentTierNum);
            setCurrentClaimAmount(ethers.formatUnits(dailyRewardAmount, 18));

            const nextTierCandidateId = currentTierNum + 1;
            try {
                const [nextReward, nextCost] = await contract.getClaimTierConfig(nextTierCandidateId);
                if (Number(nextReward) > 0) {
                    setNextTierId(nextTierCandidateId);
                    setNextTierReward(ethers.formatUnits(nextReward, 18));
                    setNextTierCostETH(ethers.formatEther(nextCost));
                } else { setNextTierId(null); }
            } catch {
                setNextTierId(null);
            }
        } catch (error: unknown) {
            console.error("Failed to check claim status:", error);
            showMessage("Error fetching data from contract.");
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
        } finally {
            // Delay setting isLoading to false to ensure all states are updated
            setTimeout(() => setIsLoading(false), 500);
        }
    }, [connected, provider, showMessage]);

    useEffect(() => {
        if (walletReady) {
            setIsLoading(true);
            checkClaimStatus();
        } else {
            setIsLoading(true);
        }
    }, [walletReady, checkClaimStatus]);

    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (walletReady && connected && cooldownSeconds > 0 && !isLoading) {
            timerIntervalRef.current = setInterval(() => {
                setCooldownSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current!);
                        checkClaimStatus();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [connected, cooldownSeconds, walletReady, checkClaimStatus, isLoading]);

    useEffect(() => {
        setRemainingTimeDisplay(formatTime(cooldownSeconds));
    }, [cooldownSeconds, formatTime]);
    
    const handleGenericTransaction = async (txFunction: () => Promise<ethers.ContractTransactionResponse>, successMessage: string, failureMessage: string) => {
        if (!provider) return;
        setIsProcessingTx(true);
        setTxStatus({ hash: null, status: 'pending' });
        showMessage("Sending transaction...");
        try {
            const tx = await txFunction();
            setTxStatus({ hash: tx.hash, status: 'pending' });
            await tx.wait();
            setTxStatus({ hash: tx.hash, status: 'success' });
            showMessage(successMessage);
            await checkClaimStatus();
        } catch (err: unknown) {
            let errorDetails: EthersError | undefined;
            if (err instanceof Error) { errorDetails = err as EthersError; } 
            else if (typeof err === 'object' && err !== null) { errorDetails = err as EthersError; }
            setTxStatus({ hash: errorDetails?.transactionHash || null, status: 'failed' });
            if (errorDetails?.code === "ACTION_REJECTED" || errorDetails?.code === "4001" || errorDetails?.code === "-32003") {
                showMessage("Transaction rejected by user.");
            } else {
                const errorMessage = errorDetails?.reason || failureMessage;
                showMessage(errorMessage);
            }
            console.error(failureMessage, err);
        } finally {
            setIsProcessingTx(false);
        }
    };

    const handleClaimDaily = () => {
        if (!canClaimDerived || !hasMinGipieForClaim) return;
        handleGenericTransaction(
            async () => {
                const signer = await provider!.getSigner();
                const contract = new ethers.Contract(CONTRACT_ADDRESS, TesterABI, signer);
                return contract.claimDaily();
            },
            "Daily reward claimed successfully!",
            "Failed to claim daily reward."
        );
    };

    const handleUpgradeClaim = () => {
        if (!canUpgrade || nextTierId === null) return;
        handleGenericTransaction(
            async () => {
                const signer = await provider!.getSigner();
                const contract = new ethers.Contract(CONTRACT_ADDRESS, TesterABI, signer);
                const costInWei = ethers.parseEther(nextTierCostETH);
                return contract.upgradeClaim(nextTierId, { value: costInWei });
            },
            `Successfully upgraded to Tier ${nextTierId}!`,
            "Failed to upgrade claim tier."
        );
    };

    const handleAccordionToggle = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center py-12 px-4">
            <style jsx>{` @keyframes blur-fade-in-out { 0% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } 10% { opacity: 1; filter: blur(0); transform: translateY(0); } 90% { opacity: 1; filter: blur(0); transform: translateY(0); } 100% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } } .animate-blur-fade { animation: blur-fade-in-out 3.5s ease-out forwards; } `}</style>

            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-2 drop-shadow-lg">
                        Daily Reward
                    </h1>
                    <p className="text-gray-300 text-lg">Claim your GipieCoin every 24 hours.</p>
                </div>

                <div className="border border-slate-700 rounded-2xl overflow-hidden mb-4">
                    <button
                        onClick={() => handleAccordionToggle('daily_claim')}
                        className="w-full p-4 flex justify-between items-center bg-gray-800 bg-opacity-60 backdrop-blur-lg hover:bg-opacity-80 transition-colors"
                    >
                        <div className="flex items-center text-left">
                            <LockIcon />
                            <div>
                                <h3 className="text-md font-semibold text-white">Daily Claim</h3>
                                <p className="text-sm text-slate-400">Claim your daily GIPIE reward</p>
                            </div>
                        </div>
                        <ChevronDownIcon isOpen={openAccordion === 'daily_claim'} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                        {openAccordion === 'daily_claim' && (
                            <motion.div
                                key="content"
                                initial="collapsed"
                                animate="open"
                                exit="collapsed"
                                variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                                className="bg-gray-900/50"
                            >
                                <div className="p-6">
                                    <div className="mb-6 text-center bg-gradient-to-r from-teal-500/10 to-green-500/10 border border-teal-400/20 rounded-lg p-6">
                                        <div className="text-sm font-medium text-teal-300 mb-1">
                                            {isLoading && connected ? <SkeletonLoader className="h-5 w-32 mx-auto" /> : `Your Daily Reward (Tier ${userCurrentTier})`}
                                        </div>
                                        <div className="text-5xl font-bold text-white">
                                            {isLoading && connected ? <SkeletonLoader className="h-12 w-48 mx-auto mt-2" /> : `${currentClaimAmount} GIPIE`}
                                        </div>
                                    </div>

                                    <div className="mb-6 space-y-3 bg-gray-900/50 rounded-lg p-4">
                                        <div className="flex justify-between items-center text-lg">
                                            <span className="font-medium text-gray-300">Next Claim In:</span>
                                            <span className="font-bold text-yellow-300">
                                                {isLoading ? <SkeletonLoader className="h-6 w-24" /> : remainingTimeDisplay}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-lg border-t border-gray-700 pt-3 mt-2">
                                            <span className="font-medium text-gray-300">Total GIPIE Minted:</span>
                                            <span className="font-bold text-green-400">
                                                {isLoading ? <SkeletonLoader className="h-6 w-32" /> : parseFloat(totalMinted).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleClaimDaily}
                                        disabled={isProcessingTx || isLoading || !canClaimDerived || !hasMinGipieForClaim}
                                        className="w-full py-3 rounded-lg font-bold text-xl transition-all duration-300 ease-in-out transform bg-gradient-to-r from-green-500 to-teal-500 enabled:hover:scale-105 enabled:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isProcessingTx ? "Processing..." : 
                                         !connected ? "Connect Wallet" :
                                         isLoading ? "Loading Status..." :
                                         contractLocked ? "Contract Locked" :
                                         !hasMinGipieForClaim ? `Need ${MIN_GIPIE_BALANCE_TO_CLAIM} GIPIE` :
                                         !canClaimDerived ? "Claim Not Available" :
                                         "Claim Your Daily GIPIE"}
                                    </button>
                                    
                                    {connected && !contractLocked && nextTierId !== null && !hasMinGipieForClaim && (
                                        <div className="mt-8 text-center p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                                            <p className="font-medium text-yellow-300">You need {MIN_GIPIE_BALANCE_TO_CLAIM} GIPIE to unlock this feature.</p>
                                        </div>
                                    )}

                                    {showUpgradeSection && (
                                        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-700">
                                            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 text-center">Upgrade Your Tier</h2>
                                            <div className="bg-gray-900/50 p-6 rounded-lg space-y-3 text-lg">
                                                <div className="flex justify-between"><span>Next Tier:</span><span className="font-bold">Tier {nextTierId}</span></div>
                                                <div className="flex justify-between"><span>New Daily Reward:</span><span className="font-bold text-green-400">{nextTierReward} GIPIE</span></div>
                                                <div className="flex justify-between"><span>Upgrade Cost:</span><span className="font-bold text-yellow-300">{nextTierCostETH} BNB</span></div>
                                            </div>
                                            <button
                                                onClick={handleUpgradeClaim}
                                                disabled={isProcessingTx || isLoading || !canUpgrade}
                                                className="w-full mt-4 py-3 rounded-lg font-bold text-xl transition-all duration-300 ease-in-out transform bg-gradient-to-r from-blue-500 to-purple-600 enabled:hover:scale-105 enabled:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isProcessingTx ? "Processing..." : `Upgrade to Tier ${nextTierId}`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {txStatus.hash && (
                    <div className="mt-6 p-4 bg-gray-900/70 rounded-lg text-center">
                        {txStatus.status === "pending" && (<div className="flex items-center justify-center space-x-3 text-yellow-300"><svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span className="font-medium">Transaction Pending...</span></div>)}
                        {txStatus.status === "success" && (<div className="flex items-center justify-center space-x-3 text-green-400"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span className="font-medium">Transaction Successful!</span></div>)}
                        {txStatus.status === "failed" && (<div className="flex items-center justify-center space-x-3 text-red-500"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span className="font-medium">Transaction Failed.</span></div>)}
                        <a href={`${BINANCE_EXPLORER_URL}${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 underline block mt-3 text-sm">View on Bscscan</a>
                    </div>
                )}
            </div>
            
            {message && (<div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl border border-gray-700 z-50 animate-blur-fade"><p className="text-base font-medium text-center">{message}</p></div>)}
        </div>
    );
}