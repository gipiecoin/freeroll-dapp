"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/walletContext";
import GIPIE_ABI from "../abi/TesterABI.json";
import StakingABI from "../abi/StakingABI.json";

// --- Configuration ---
const GIPIE_TOKEN_ADDRESS = "0x03285a2f201ac1c00e51b77b0a55f139f3a7d591";
const STAKING_CONTRACT_ADDRESS = "0xf80f23326eb01856373e7678906f7d2d994f5cd2";
const BINANCE_EXPLORER_URL = "https://bscscan.com/tx/";

const APY_RATES: { [key: number]: number } = { 15: 0.05, 30: 0.10, 60: 0.15, 180: 0.25, 360: 0.40 };
const PENALTY_RATE = 0.025;

// --- Types ---
interface EthersError extends Error {
  code?: string | number;
  reason?: string;
  transactionHash?: string;
}

function isEthersError(err: unknown): err is EthersError {
  return err instanceof Error && ('code' in err || 'reason' in err || 'transactionHash' in err);
}

// --- Small Reusable Components ---
const SkeletonLoader = ({ className = "" }: { className?: string }) => (
    <div className={`bg-gray-700 animate-pulse rounded-md ${className}`} />
);

// --- Main Component ---
export default function Stake() {
    const { connected, provider, walletReady, balance: gipieBalance } = useWallet();

    // --- State Management ---
    const [view, setView] = useState<'stake' | 'withdraw'>('stake');
    const [stakeAmount, setStakeAmount] = useState<string>("");
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
    const [currentAllowance, setCurrentAllowance] = useState<bigint>(ethers.toBigInt(0));
    
    // Stake Info State
    const [hasActiveStake, setHasActiveStake] = useState<boolean>(false);
    const [stakedAmount, setStakedAmount] = useState<string>("0");
    const [stakeEndTime, setStakeEndTime] = useState<number>(0);
    const [remainingStakeTime, setRemainingStakeTime] = useState<string>("0s");
    
    // UI & Transaction State
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isProcessingTx, setIsProcessingTx] = useState<boolean>(false);
    const [message, setMessage] = useState<string | null>(null);
    const [txStatus, setTxStatus] = useState<{ hash: string | null; status: 'pending' | 'success' | 'failed' | null }>({ hash: null, status: null });

    // --- Memoized & Derived Values ---
    const userGIPIEBalance = useMemo(() => parseFloat(gipieBalance || "0"), [gipieBalance]);
    const inputStakeAmount = useMemo(() => parseFloat(stakeAmount || "0"), [stakeAmount]);
    const isStakeAmountValid = useMemo(() => inputStakeAmount > 0 && inputStakeAmount <= userGIPIEBalance, [inputStakeAmount, userGIPIEBalance]);
    const isApproved = useMemo(() => {
        if (!stakeAmount || !isStakeAmountValid) return false;
        try {
            return currentAllowance >= ethers.parseUnits(stakeAmount, 18);
        } catch { return false; }
    }, [currentAllowance, stakeAmount, isStakeAmountValid]);

    const estimatedReward = useMemo(() => {
        if (!selectedDuration || !isStakeAmountValid) return "0.0000";
        const apy = APY_RATES[selectedDuration] ?? 0;
        const reward = inputStakeAmount * apy * (selectedDuration / 365);
        return reward.toFixed(4);
    }, [inputStakeAmount, selectedDuration, isStakeAmountValid]);

    const earlyWithdrawalInfo = useMemo(() => {
        const isEarly = hasActiveStake && stakeEndTime > Date.now();
        if (!isEarly) return { isEarly: false, penalty: "0", net: stakedAmount };
        const penalty = parseFloat(stakedAmount) * PENALTY_RATE;
        const net = parseFloat(stakedAmount) - penalty;
        return { isEarly, penalty: penalty.toFixed(4), net: net.toFixed(4) };
    }, [hasActiveStake, stakeEndTime, stakedAmount]);

    // --- Logic Functions (Callbacks & Effects) ---
    const showMessage = useCallback((msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 3500); }, []);
    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "0d 0h 0m";
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    const checkStatus = useCallback(async () => {
        if (!connected || !provider) { setIsLoading(false); return; }
        try {
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();
            const gipieContract = new ethers.Contract(GIPIE_TOKEN_ADDRESS, GIPIE_ABI, signer);
            const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, StakingABI, signer);

            const [allowance, stakeInfo] = await Promise.all([
                gipieContract.allowance(userAddress, STAKING_CONTRACT_ADDRESS),
                stakingContract.stakes(userAddress)
            ]);

            setCurrentAllowance(allowance);
            const currentStakedAmount = parseFloat(ethers.formatUnits(stakeInfo.amount, 18));
            setStakedAmount(currentStakedAmount.toString());
            
            const endTime = Number(stakeInfo.endTime) * 1000;
            setStakeEndTime(endTime);
            
            const isActive = currentStakedAmount > 0;
            setHasActiveStake(isActive);
            if (isActive) {
              setView('withdraw');
            } else {
              setView('stake');
            }

        } catch (err: unknown) {
            if (isEthersError(err)) {
                console.error("Failed to check stake status:", err);
                showMessage("Error fetching stake info.");
            } else {
                console.error("Failed to check stake status:", err);
                showMessage("Error fetching stake info.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [connected, provider, showMessage]);

    useEffect(() => {
        if(walletReady) {
          setIsLoading(true);
          checkStatus();
        } else {
          setIsLoading(true);
        }
    }, [walletReady, checkStatus]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (hasActiveStake && stakeEndTime > 0) {
                const remaining = Math.max(0, Math.floor((stakeEndTime - Date.now()) / 1000));
                setRemainingStakeTime(formatTime(remaining));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [hasActiveStake, stakeEndTime]);
    
    // --- Transaction Handlers ---
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
        await checkStatus();
      } catch (err: unknown) {
        if (isEthersError(err)) {
          setTxStatus({ hash: err.transactionHash || null, status: 'failed' });
          if (err.code === "ACTION_REJECTED") {
            showMessage("Transaction rejected by user.");
          } else {
            showMessage(err.reason || failureMessage);
          }
          console.error(failureMessage, err);
        } else {
          setTxStatus({ hash: null, status: 'failed' });
          showMessage(failureMessage);
          console.error(failureMessage, err);
        }
      } finally {
        setIsProcessingTx(false);
      }
    };
    
    const handleApprove = () => {
        if (!isStakeAmountValid) return;
        const signerPromise = provider!.getSigner();
        handleGenericTransaction(
            async () => {
                const signer = await signerPromise;
                const gipieContract = new ethers.Contract(GIPIE_TOKEN_ADDRESS, GIPIE_ABI, signer);
                return gipieContract.approve(STAKING_CONTRACT_ADDRESS, ethers.parseUnits(stakeAmount, 18));
            },
            "Approval successful!",
            "Approval failed."
        );
    };

    const handleStake = () => {
        if (!isStakeAmountValid || !selectedDuration || !isApproved) return;
        const signerPromise = provider!.getSigner();
        handleGenericTransaction(
            async () => {
                const signer = await signerPromise;
                const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, StakingABI, signer);
                return stakingContract.stake(ethers.parseUnits(stakeAmount, 18), selectedDuration);
            },
            "Staking successful!",
            "Staking failed."
        ).then(() => {
            setStakeAmount("");
            setSelectedDuration(null);
        });
    };

    const handleWithdraw = () => {
        if (!hasActiveStake) return;
        const signerPromise = provider!.getSigner();
        handleGenericTransaction(
            async () => {
                const signer = await signerPromise;
                const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, StakingABI, signer);
                return stakingContract.withdraw();
            },
            "Withdrawal successful!",
            "Withdrawal failed."
        );
    };

    // --- Render ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center py-12 px-4">
            <style jsx>{` @keyframes blur-fade-in-out { 0% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } 10% { opacity: 1; filter: blur(0); transform: translateY(0); } 90% { opacity: 1; filter: blur(0); transform: translateY(0); } 100% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } } .animate-blur-fade { animation: blur-fade-in-out 3.5s ease-out forwards; } `}</style>

            <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full text-white border border-gray-700">
                <div className="text-center mb-6">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400 mb-2 drop-shadow-lg">
                        Stake GIPIE
                    </h1>
                    <p className="text-gray-300 text-lg">Lock tokens to earn passive rewards.</p>
                </div>
                
                {/* Tab Navigation */}
                <div className="mb-6 grid grid-cols-2 gap-2 bg-gray-900/50 p-1 rounded-lg">
                    <button onClick={() => setView('stake')} disabled={hasActiveStake} className={`py-2 px-4 rounded-md font-semibold text-sm transition-all ${view === 'stake' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800/50'} disabled:opacity-50 disabled:cursor-not-allowed`}>Stake</button>
                    <button onClick={() => setView('withdraw')} disabled={!hasActiveStake} className={`py-2 px-4 rounded-md font-semibold text-sm transition-all ${view === 'withdraw' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800/50'} disabled:opacity-50 disabled:cursor-not-allowed`}>My Stake</button>
                </div>

                {/* Main Content Area */}
                <div>
                    {view === 'stake' ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-300">Your Balance</span>
                                {isLoading ? <SkeletonLoader className="h-6 w-28" /> : <span className="font-bold text-lg text-white">{userGIPIEBalance.toFixed(4)} GIPIE</span>}
                            </div>
                           
                            {/* --- MODIFIED SECTION START --- */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Stake</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={stakeAmount}
                                        onChange={e => setStakeAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg p-3 pr-20 text-white text-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                    />
                                    <button
                                        onClick={() => setStakeAmount(userGIPIEBalance.toString())}
                                        className="absolute top-1/2 right-2 transform -translate-y-1/2 py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-bold"
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>
                            {/* --- MODIFIED SECTION END --- */}

                            {!isStakeAmountValid && stakeAmount !== "" && <p className="text-red-400 text-xs mt-1">Invalid amount or exceeds balance.</p>}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Select Duration</label>
                                <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                                    {Object.keys(APY_RATES).map(d => (
                                        <button key={d} onClick={() => setSelectedDuration(Number(d))} className={`py-2 px-2 rounded-md font-semibold text-xs text-center transition-all ${selectedDuration === Number(d) ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600'}`}>{d} Days</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-300">Estimated Reward</span>
                                <span className="font-bold text-lg text-green-400">~{estimatedReward} GIPIE</span>
                            </div>
                            <button onClick={isApproved ? handleStake : handleApprove} disabled={isLoading || isProcessingTx || !isStakeAmountValid || (isApproved && !selectedDuration)} className="w-full py-3 rounded-lg font-bold text-xl transition-all duration-300 ease-in-out transform bg-gradient-to-r from-blue-500 to-purple-600 enabled:hover:scale-105 enabled:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700">
                                {isProcessingTx ? "Processing..." : isApproved ? "Stake Now" : "Approve GIPIE"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center bg-gray-900/50 p-6 rounded-lg">
                                <p className="text-sm font-medium text-gray-300">Amount Staked</p>
                                {isLoading ? <SkeletonLoader className="h-10 w-48 mx-auto mt-2" /> : <p className="text-4xl font-bold text-purple-400 mt-1">{parseFloat(stakedAmount).toFixed(4)} GIPIE</p>}
                            </div>
                            <div className="text-center bg-gray-900/50 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-300">Time Remaining</p>
                                {isLoading ? <SkeletonLoader className="h-8 w-32 mx-auto mt-2" /> : <p className="text-2xl font-bold text-yellow-300 mt-1">{remainingStakeTime}</p>}
                            </div>
                            {earlyWithdrawalInfo.isEarly && (
                                <div className="text-center text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700/50 p-2 rounded-md">
                                    Early withdrawal incurs a {PENALTY_RATE * 100}% penalty ({earlyWithdrawalInfo.penalty} GIPIE).
                                </div>
                            )}
                            <button onClick={handleWithdraw} disabled={isLoading || isProcessingTx} className="w-full py-3 rounded-lg font-bold text-xl transition-all duration-300 ease-in-out transform bg-gradient-to-r from-red-600 to-orange-600 enabled:hover:scale-105 enabled:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
                                {isProcessingTx ? "Withdrawing..." : "Withdraw"}
                            </button>
                        </div>
                    )}
                </div>

                {/* RESTORED: Full transaction status display with icons */}
                {txStatus.hash && (
                  <div className="mt-6 p-4 bg-gray-900/70 rounded-lg text-center">
                    {txStatus.status === "pending" && (
                      <div className="flex items-center justify-center space-x-3 text-yellow-300">
                        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="font-medium">Transaction Pending...</span>
                      </div>
                    )}
                    {txStatus.status === "success" && (
                      <div className="flex items-center justify-center space-x-3 text-green-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Transaction Successful!</span>
                      </div>
                    )}
                    {txStatus.status === "failed" && (
                      <div className="flex items-center justify-center space-x-3 text-red-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Transaction Failed.</span>
                      </div>
                    )}
                    <a href={`${BINANCE_EXPLORER_URL}${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 underline block mt-3 text-sm">
                      View on Bscscan
                    </a>
                  </div>
                )}
            </div>
            
            {message && (
                <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl border border-gray-700 z-50 animate-blur-fade">
                    <p className="text-base font-medium text-center">{message}</p>
                </div>
            )}
        </div>
    );
}