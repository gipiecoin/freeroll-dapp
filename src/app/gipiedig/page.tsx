// src/app/daily-dig-demo/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/walletContext";
import DailyDigABI from "@/app/abi/DailyDigABI.json";
import ERC20GIPIEABI from "@/app/abi/TesterABI.json";

// --- CONSTANTS ---
const GRID_SIZE = 5;
const MAX_DIGS_PER_PERIOD_UI = 3;
const BSC_MAINNET_CHAIN_ID = 56;
const BSC_EXPLORER_URL = "https://bscscan.com/tx/";

// --- CONTRACT ADDRESSES ---
const DAILY_DIG_CONTRACT_ADDRESS_BSC = "0x3DB8a1Cf9ace7aeA2e9B11D9B055143b5Eb102A4";
const GIP_TOKEN_CONTRACT_ADDRESS_BSC = "0x03285a2F201AC1c00E51b77b0A55F139f3A7D591";

// --- INTERFACES ---
interface Prize {
    type: "gipiet" | "empty";
    amount?: number;
    label?: string;
    row: number;
    col: number;
}

interface EthersError extends Error {
    code?: string | number;
    reason?: string;
    data?: string;
    message: string;
    transactionHash?: string;
}

const SkeletonLoader = ({ className = "" }: { className?: string }) => (
    <div className={`bg-gray-700 animate-pulse rounded-md ${className}`} />
);

const GameContent = () => {
    const { connected, provider, signer, walletReady } = useWallet();
    const [address, setAddress] = useState<string | null>(null);
    const [grid, setGrid] = useState<Prize[][]>(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    const [revealedCells, setRevealedCells] = useState(() => new Set<string>());
    const [digsRemaining, setDigsRemaining] = useState<number>(MAX_DIGS_PER_PERIOD_UI);
    const [userGIPIEBalance, setUserGIPIEBalance] = useState<string | null>(null);
    const [pendingGIPIERewards, setPendingGIPIERewards] = useState<string | null>("0.00");
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
    const [remainingTimeDisplay, setRemainingTimeDisplay] = useState<string>("Ready!");
    const [message, setMessage] = useState<string | null>(null);
    const [isProcessingTx, setIsProcessingTx] = useState<boolean>(false);
    const [txStatus, setTxStatus] = useState<{ hash: string | null; status: string | null }>({ hash: null, status: null });
    const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
    const [activeCell, setActiveCell] = useState<string | null>(null);

    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const canDig = connected && !isProcessingTx && digsRemaining > 0;
    const canClaim = connected && !isProcessingTx && (parseFloat(pendingGIPIERewards || "0") > 0);

    const showMessage = useCallback((msg: string, duration = 3500) => {
        setMessage(msg);
        const timer = setTimeout(() => setMessage(null), duration);
        return () => clearTimeout(timer);
    }, []);

    const formatTime = useCallback((seconds: number): string => {
        if (seconds <= 0) return "Ready!";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    }, []);

    const checkPlayerStatus = useCallback(async () => {
        if (!connected || !provider || !signer) {
            setIsLoadingStatus(false);
            setUserGIPIEBalance(connected ? "0.00" : null);
            setPendingGIPIERewards(connected ? "0.00" : null);
            setDigsRemaining(MAX_DIGS_PER_PERIOD_UI);
            setRevealedCells(new Set());
            setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
            setCooldownSeconds(0);
            setAddress(null);
            console.log("Wallet/Connection Issue:", { connected, provider, signer });
            return;
        }
        setIsLoadingStatus(true);
        try {
            const network = await provider.getNetwork();
            if (Number(network.chainId) !== Number(BSC_MAINNET_CHAIN_ID)) {
                showMessage(`Please switch to BNB Smart Chain Mainnet. Connected to: ${network.name}`);
                setIsLoadingStatus(false);
                setUserGIPIEBalance(null);
                setPendingGIPIERewards(null);
                setDigsRemaining(0);
                setCooldownSeconds(0);
                setAddress(null);
                return;
            }
            const _address = await signer.getAddress();
            setAddress(_address);

            const dailyDigContract = new ethers.Contract(DAILY_DIG_CONTRACT_ADDRESS_BSC, DailyDigABI, signer);
            const gipTokenContract = new ethers.Contract(GIP_TOKEN_CONTRACT_ADDRESS_BSC, ERC20GIPIEABI, signer);
            const [currentDigsLeftFromContract, timeUntilNextResetFromContract, pendingRewardsWeiBigInt] = await dailyDigContract.getPlayerPeriodStatus(_address);
            console.log("Raw Contract Data:", {
                digsLeft: Number(currentDigsLeftFromContract),
                timeUntilNextReset: Number(timeUntilNextResetFromContract),
                pendingRewards: ethers.formatUnits(pendingRewardsWeiBigInt, 18),
            });

            const _digsLeft = Number(currentDigsLeftFromContract);
            const _timeUntilNextReset = Number(timeUntilNextResetFromContract);
            const adjustedCooldown = _digsLeft === 0 && _timeUntilNextReset > 0 ? _timeUntilNextReset : 0;

            const _pendingRewards = ethers.formatUnits(pendingRewardsWeiBigInt, 18);

            setCooldownSeconds(adjustedCooldown);
            setDigsRemaining(_digsLeft);
            setPendingGIPIERewards(_pendingRewards);

            let gipBalance: bigint;
            try {
                gipBalance = await gipTokenContract.balanceOf(_address);
                console.log("GIPIE Balance (Wei):", gipBalance.toString());
            } catch (e) {
                console.error("Failed to fetch GIPIE balance:", e);
                gipBalance = BigInt(0);
            }
            const balanceStr = ethers.formatUnits(gipBalance, 18);
            setUserGIPIEBalance(balanceStr);
            console.log("User GIPIE Balance (Formatted):", balanceStr);

            if (_digsLeft === 0 && adjustedCooldown > 0) {
                setRevealedCells(new Set());
                setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
            }
        } catch (error) {
            const err = error as EthersError;
            const errorMessage = err.message || "Unknown error";
            console.error("Failed to check player status - Detailed Error:", {
                message: errorMessage,
                code: err.code,
                reason: err.reason,
                data: err.data,
                stack: err.stack,
            });
            showMessage(`Error fetching status: ${errorMessage}`);
            setUserGIPIEBalance("Error");
            setPendingGIPIERewards("Error");
            setDigsRemaining(0);
            setCooldownSeconds(0);
            setAddress(null);
        } finally {
            setIsLoadingStatus(false);
        }
    }, [connected, provider, signer, showMessage]);

    const handleTransaction = useCallback(
        async (txPromise: Promise<ethers.ContractTransactionResponse>, successMsg: string, failureMsg: string) => {
            if (!signer) {
                showMessage("Please connect your wallet.");
                setIsProcessingTx(false);
                return null;
            }
            setIsProcessingTx(true);
            setTxStatus({ hash: null, status: "pending" });
            showMessage("Sending transaction...");
            try {
                const tx = await txPromise;
                setTxStatus({ hash: tx.hash, status: "pending" });
                console.log("Transaction sent, waiting for confirmation:", tx.hash);
                const receipt = await tx.wait();

                if (receipt && receipt.status === 1) {
                    setTxStatus({ hash: tx.hash, status: "success" });
                    showMessage(successMsg);
                    await checkPlayerStatus();
                    return receipt;
                } else {
                    throw new Error(`Transaction failed on chain: status 0. Hash: ${receipt?.hash || tx.hash || "Unknown"}`);
                }
            } catch (error) {
                const err = error as EthersError;
                setTxStatus({ hash: err.transactionHash || null, status: "failed" });
                let errorMessage = err.message || failureMsg;
                if (
                    (typeof err.code === "string" && err.code === "ACTION_REJECTED") ||
                    (typeof err.code === "number" && (err.code === 4001 || err.code === 5001)) ||
                    (err.message && (err.message.toLowerCase().includes("rejected") || err.message.toLowerCase().includes("cancelled") || err.message.toLowerCase().includes("user denied")))
                ) {
                    errorMessage = "Rejected by user";
                } else if (err.message && !errorMessage.includes(failureMsg)) {
                    errorMessage = `${failureMsg}: ${err.message}`;
                }
                showMessage(errorMessage);
                console.error("Transaction Error:", {
                    message: err.message,
                    code: err.code,
                    reason: err.reason,
                    data: err.data,
                    stack: err.stack,
                });
                return null;
            } finally {
                setIsProcessingTx(false);
                setActiveCell(null);
            }
        },
        [showMessage, signer, checkPlayerStatus]
    );

    const handleDig = useCallback(
        async (rowIndex: number, colIndex: number) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            if (!canDig) {
                if (!connected) showMessage("Please connect your wallet!");
                else if (digsRemaining === 0) showMessage("No digs left! Wait 30 minutes for next period.");
                return;
            }

            setActiveCell(cellKey);
            if (!signer) {
                showMessage("Wallet not connected.");
                setActiveCell(null);
                return;
            }

            const dailyDigContract = new ethers.Contract(DAILY_DIG_CONTRACT_ADDRESS_BSC, DailyDigABI, signer);

            try {
                console.log("Attempting dig - Remaining digs:", digsRemaining);
                const receipt = await handleTransaction(
                    dailyDigContract.dig(rowIndex, colIndex, { gasLimit: ethers.parseUnits("200000", 0) }),
                    "Dig successful!",
                    "Dig failed"
                );

                if (receipt) {
                    const eventFilter = dailyDigContract.filters.DigPerformed(address);
                    const events = await dailyDigContract.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber);

                    if (events.length > 0) {
                        const event = events[0] as ethers.EventLog & {
                            args: { player: string; row: bigint; col: bigint; foundPrize: boolean; prizeAmount: bigint };
                        };
                        const foundPrize = event.args.foundPrize;
                        const prizeAmount = ethers.formatUnits(event.args.prizeAmount, 18);

                        setRevealedCells((prev) => {
                            const newSet = new Set(prev);
                            newSet.add(cellKey);
                            return newSet;
                        });
                        setGrid((prevGrid) => {
                            const newGrid = prevGrid.map((row) => [...row]);
                            newGrid[rowIndex][colIndex] = {
                                type: foundPrize ? "gipiet" : "empty",
                                amount: foundPrize ? parseFloat(prizeAmount) : undefined,
                                label: foundPrize ? `${prizeAmount}` : undefined,
                                row: rowIndex,
                                col: colIndex,
                            };
                            return newGrid;
                        });
                        showMessage(foundPrize ? `Found ${prizeAmount} GIPIE! 🎉` : "Found nothing here. ⭕");
                    }
                }
            } catch (error) {
                console.error("Error in handleDig:", error);
            }
        },
        [canDig, connected, signer, digsRemaining, showMessage, address, handleTransaction]
    );

    const handleClaimRewards = useCallback(async () => {
        if (!canClaim) {
            console.log("Cannot claim:", { connected, isProcessingTx, pendingGIPIERewards });
            if (!connected) showMessage("Please connect your wallet to claim!");
            else showMessage("No rewards available to claim.");
            return;
        }
        if (!signer) {
            showMessage("Wallet not connected.");
            return;
        }
        const dailyDigContract = new ethers.Contract(DAILY_DIG_CONTRACT_ADDRESS_BSC, DailyDigABI, signer);

        try {
            const receipt = await handleTransaction(
                dailyDigContract.claimRewards({ gasLimit: ethers.parseUnits("200000", 0) }),
                "Rewards claimed successfully!",
                "Claim failed"
            );
            if (receipt) {
                setRevealedCells(new Set());
                setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
            }
        } catch (error) {
            console.error("Error in handleClaimRewards:", error);
        }
    }, [canClaim, connected, signer, showMessage, handleTransaction, pendingGIPIERewards]);

    useEffect(() => {
        if (walletReady && connected) {
            checkPlayerStatus();
        } else if (walletReady && !connected) {
            setUserGIPIEBalance(null);
            setPendingGIPIERewards(null);
            setDigsRemaining(MAX_DIGS_PER_PERIOD_UI);
            setCooldownSeconds(0);
            setRevealedCells(new Set());
            setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
            setIsLoadingStatus(false);
            setAddress(null);
        }
    }, [walletReady, connected, checkPlayerStatus]);

    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        console.log("Setting timer with cooldownSeconds:", cooldownSeconds);
        if (cooldownSeconds > 0) {
            timerIntervalRef.current = setInterval(() => {
                setCooldownSeconds((prev) => {
                    console.log("Tick - Remaining:", prev);
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current!);
                        checkPlayerStatus();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            checkPlayerStatus();
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [cooldownSeconds, checkPlayerStatus]);

    useEffect(() => {
        setRemainingTimeDisplay(formatTime(cooldownSeconds));
    }, [cooldownSeconds, formatTime]);

    // Prize pool data based on the contract's GIPIE_PRIZE_POOL_WEIGHTED
    const prizePool = [
        { amount: 0.005, rarity: "Common", icon: "🪙" },
        { amount: 0.01, rarity: "Uncommon", icon: "🪙" },
        { amount: 0.025, rarity: "Rare", icon: "🌟" },
        { amount: 0.05, rarity: "Epic", icon: "💎" },
        { amount: 0.1, rarity: "Legendary", icon: "🔥" },
        { amount: 0.25, rarity: "Mythic", icon: "🌌", jackpot: true },
        { amount: 0.5, rarity: "Mythic", icon: "🌌", jackpot: true },
        { amount: 1, rarity: "Mythic", icon: "🌌", jackpot: true },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center py-12 px-4">
            <style jsx>{`
                @keyframes blur-fade-in-out { 0% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } 10% { opacity: 1; filter: blur(0); transform: translateY(0); } 90% { opacity: 1; filter: blur(0); transform: translateY(0); } 100% { opacity: 0; filter: blur(5px); transform: translateY(-20px); } }
                .animate-blur-fade { animation: blur-fade-in-out 3.5s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-in; }
                @keyframes dig-reveal { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
                .animate-dig-reveal { animation: dig-reveal 0.3s ease-out; }
                @keyframes thrilling-pulse { 0% { transform: scale(1) rotate(0deg); box-shadow: 0 0 5px #00ffcc; } 25% { transform: scale(1.1) rotate(5deg); box-shadow: 0 0 15px #00ffcc, 0 0 25px #ff00cc; } 50% { transform: scale(1) rotate(-5deg); box-shadow: 0 0 10px #ff00cc; } 75% { transform: scale(1.1) rotate(5deg); box-shadow: 0 0 20px #00ffcc; } 100% { transform: scale(1) rotate(0deg); box-shadow: 0 0 5px #00ffcc; } }
                .thrilling-pulse { animation: thrilling-pulse 0.8s infinite; }
                @keyframes loading-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .loading-spin { animation: loading-spin 1s linear infinite; }
                @keyframes countdown-pulse { 0% { transform: scale(1); color: #22d3ee; } 50% { transform: scale(1.1); color: #06b6d4; } 100% { transform: scale(1); color: #22d3ee; } }
                .countdown-pulse { animation: countdown-pulse 1.5s infinite; }
                @keyframes grid-close { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0.5; transform: scale(0.9); } }
                .grid-close { animation: grid-close 10s linear forwards; }
                @keyframes countdown-appear { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
                .countdown-appear { animation: countdown-appear 0.5s ease-out forwards; }
                @keyframes prize-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                .prize-pulse { animation: prize-pulse 1.5s infinite; }
            `}</style>
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-2 drop-shadow-lg">
                        GipieDig
                    </h1>
                    <p className="text-gray-300 text-lg">Dig for GIPIE (3 Digs Every 30 Minutes)</p>
                    <p className="text-sm text-gray-500">Small rewards common, big rare</p>
                    <div className="mt-6 border border-gray-700 rounded-lg overflow-hidden bg-gray-900/60">
                        <div className="p-4">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-teal-300 uppercase bg-gray-800/80">
                                    <tr className="border-b border-gray-700/50">
                                        <th scope="col" className="px-4 py-2 font-semibold">Rarity</th>
                                        <th scope="col" className="px-4 py-2 font-semibold text-right">Payout (GIPIE)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prizePool.map((prize, index) => (
                                        <tr
                                            key={index}
                                            className={`border-b border-gray-700/50 last:border-b-0 ${prize.jackpot ? "bg-emerald-500/20" : "hover:bg-gray-700/50"}`}
                                        >
                                            <td className={`px-4 py-2 flex items-center ${prize.jackpot ? "font-bold text-emerald-300" : ""}`}>
                                                {prize.rarity}
                                                {prize.jackpot && (
                                                    <span className="ml-2 text-xs font-bold text-emerald-400 animate-pulse prize-pulse">[TREASURE]</span>
                                                )}
                                                <span className="ml-2 text-lg">{prize.icon}</span>
                                            </td>
                                            <td className={`px-4 py-2 font-mono text-right ${prize.jackpot ? "font-bold text-emerald-300" : ""}`}>
                                                {prize.amount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">50% chance to find a prize, subject to owner updates.</p>
                </div>
                <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg text-white border border-gray-700">
                    <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                        <div className="bg-gray-700/50 p-4 rounded-lg shadow-inner">
                            <span className="text-sm text-gray-400">Your GIPIE Balance</span>
                            <div className="text-xl font-bold text-yellow-300">
                                {isLoadingStatus ? (
                                    <SkeletonLoader className="h-6 w-24 mx-auto" />
                                ) : userGIPIEBalance === "Error" ? (
                                    <span className="text-red-500">Error</span>
                                ) : (
                                    `${userGIPIEBalance || "0.00"} 🪙`
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg shadow-inner relative">
                            <span className="text-sm text-gray-400">Digs Remaining</span>
                            <div className="text-xl font-bold text-cyan-300 flex items-center justify-center">
                                {isLoadingStatus ? <SkeletonLoader className="h-6 w-16 mx-auto" /> : `${digsRemaining}/${MAX_DIGS_PER_PERIOD_UI}`}
                            </div>
                        </div>
                    </div>
                    <div className="mb-6 bg-gray-900/50 p-4 rounded-lg shadow-lg text-center border border-gray-700">
                        <span className="text-sm text-gray-400 mb-2">Pending Rewards</span>
                        <div className="text-2xl font-bold text-green-400 mb-4">
                            {isLoadingStatus ? <SkeletonLoader className="h-8 w-32 mx-auto" /> : `${pendingGIPIERewards || "0.00"} 🪙`}
                        </div>
                        <button
                            onClick={handleClaimRewards}
                            disabled={!canClaim}
                            className="py-2 px-4 rounded-lg font-bold text-md transition-all bg-gradient-to-r from-teal-500 to-emerald-500 text-white enabled:hover:scale-105 disabled:opacity-50 w-full"
                        >
                            {isProcessingTx ? "Processing Claim..." : "Claim Rewards"}
                        </button>
                    </div>
                    <div className="relative">
                        <div className="bg-gray-900/60 border border-gray-700 rounded-lg overflow-hidden backdrop-blur-md p-4">
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                                {Array(GRID_SIZE)
                                    .fill(null)
                                    .map((_, rowIndex) =>
                                        Array(GRID_SIZE)
                                            .fill(null)
                                            .map((_, colIndex) => {
                                                const cellKey = `${rowIndex}-${colIndex}`;
                                                const isRevealed = revealedCells.has(cellKey);
                                                const cellContent = grid[rowIndex]?.[colIndex];
                                                const isActive = activeCell === cellKey && isProcessingTx;
                                                const isClosing = cooldownSeconds > 0;
                                                const cellClasses = `relative h-16 w-full flex items-center justify-center rounded-lg cursor-pointer transition-all duration-200 ease-in-out ${
                                                    isRevealed
                                                        ? cellContent?.type === "gipiet"
                                                            ? "bg-green-800/50 border-green-700"
                                                            : "bg-gray-700 border-gray-600"
                                                        : "bg-blue-600 border-blue-500 hover:bg-blue-700 active:scale-95"
                                                } ${
                                                    isProcessingTx || !connected || digsRemaining <= 0 || isClosing
                                                        ? "pointer-events-none opacity-80"
                                                        : ""
                                                } ${isActive ? "thrilling-pulse" : ""} ${isClosing ? "grid-close" : ""}`;
                                                return (
                                                    <div key={cellKey} className={cellClasses} onClick={() => handleDig(rowIndex, colIndex)}>
                                                        {isRevealed && cellContent ? (
                                                            cellContent.type === "gipiet" ? (
                                                                <span className="text-sm font-bold text-yellow-300 animate-dig-reveal flex items-center">
                                                                    {cellContent.label} 🪙
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-gray-400 animate-dig-reveal">⭕ Empty</span>
                                                            )
                                                        ) : isActive ? (
                                                            <svg
                                                                className="loading-spin h-8 w-8 text-white"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path
                                                                    className="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                                ></path>
                                                            </svg>
                                                        ) : (
                                                            <span className="text-2xl text-blue-200">?</span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                    )}
                            </div>
                        </div>
                        {cooldownSeconds > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="text-4xl font-bold text-cyan-300 countdown-appear countdown-pulse">
                                    {remainingTimeDisplay}
                                </div>
                            </div>
                        )}
                    </div>
                    {txStatus.hash && (
                        <div className="mt-6 p-4 bg-gray-900/70 rounded-lg text-center border border-gray-700">
                            {txStatus.status === "pending" && (
                                <div className="flex items-center justify-center space-x-3 text-yellow-300">
                                    <svg
                                        className="animate-spin h-6 w-6"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        ></path>
                                    </svg>
                                    <span className="font-medium">Transaction Pending...</span>
                                </div>
                            )}
                            {txStatus.status === "success" && (
                                <div className="flex items-center justify-center space-x-3 text-green-400">
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span className="font-medium">Transaction Successful!</span>
                                </div>
                            )}
                            {txStatus.status === "failed" && (
                                <div className="flex items-center justify-center space-x-3 text-red-500">
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span className="font-medium">Transaction Failed.</span>
                                </div>
                            )}
                            {txStatus.hash && (
                                <a
                                    href={`${BSC_EXPLORER_URL}${txStatus.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-500 underline block mt-3 text-sm"
                                >
                                    View on BSCScan
                                </a>
                            )}
                        </div>
                    )}
                    {message && (
                        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl border border-gray-700 z-50 animate-blur-fade">
                            <p className="text-base font-medium text-center">{message}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function GipDigPage() {
    return <GameContent />;
}