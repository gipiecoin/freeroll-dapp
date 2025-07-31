"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/walletContext";

const isLocalDebug = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true';

const debugLog = (...args: unknown[]) => {
  if (isLocalDebug) {
    console.log(...args);
  }
};

const debugWarn = (...args: unknown[]) => {
  if (isLocalDebug) {
    console.warn(...args);
  }
};

const GRID_SIZE = 4;
const MAX_FLIPS_PER_PERIOD_UI = 6;
const BNB_MAINNET_CHAIN_ID = BigInt("56");
const EXPLORER_URL = "https://bscscan.com/tx/";
const COOLDOWN_PERIOD = 1800;
const DEBOUNCE_DELAY_AFTER_TX = 2000;
const CARD_DISPLAY_DELAY = 1500;

const CRYPTO_CARD_GAME_CONTRACT_ADDRESS = "0xefB1767EdcabD3A6381FB6D79094c7490093827d";
const GIPIE_TOKEN_CONTRACT_ADDRESS = "0x03285a2F201AC1c00E51b77b0A55F139f3A7D591"; 

import CryptoCardGameABI from "@/app/abi/CryptoCardGameABI.json";
import TesterABI from "@/app/abi/TesterABI.json";

const cryptoCardGameAbi = CryptoCardGameABI;
const gipieTokenAbi = TesterABI;

interface CryptoCard {
  symbol: string;
  icon: string;
  isRare?: boolean;
  row?: number;
  col?: number;
}

interface Cell {
  symbol: string;
  icon: string;
  isRare: boolean;
  row: number;
  col: number;
}

interface CardFlippedEvent {
  player: string;
  row: bigint;
  col: bigint;
  symbol: string;
  isMatch: boolean;
  reward: bigint;
}

interface TransactionError extends Error {
  transactionHash?: string;
  reason?: string;
  code?: string;
  data?: { message: string };
}

const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-gray-700 animate-pulse rounded-md ${className}`} />
);

const SYMBOL_MAPPINGS: { [key: string]: { icon: string; isRare: boolean } } = {
  "BTC": { icon: "₿", isRare: false },
  "ETH": { icon: "Ξ", isRare: false },
  "BNB": { icon: "💎", isRare: false },
  "SOL": { icon: "☀", isRare: false },
  "JOKER": { icon: "🃏", isRare: true },
};

const getSymbolFromHash = (hash: string): string => {
  for (const symbol in SYMBOL_MAPPINGS) {
    if (ethers.keccak256(ethers.toUtf8Bytes(symbol)) === hash) return symbol;
  }
  return "?";
};

const CryptoCardFlip: React.FC = () => {
  const { connected, provider, signer } = useWallet();

  const [grid, setGrid] = useState<Cell[][]>([]);
  const [matchedCards, setMatchedCards] = useState<Set<string>>(new Set());
  const [currentlyOpenCards, setCurrentlyOpenCards] = useState<Set<string>>(new Set());
  const [flipsRemaining, setFlipsRemaining] = useState<number>(0);
  const [flipsUsed, setFlipsUsed] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [remainingTimeDisplay, setRemainingTimeDisplay] = useState<string>("Ready!");
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessingTx, setIsProcessingTx] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<{ hash: string | null; status: string | null }>({ hash: null, status: null });
  const [balance, setBalance] = useState<string>("0.00");
  const [pendingRewards, setPendingRewards] = useState<string>("0.00");
  const [firstCard, setFirstCard] = useState<Cell | null>(null);
  const [secondCard, setSecondCard] = useState<Cell | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [gipieTokenContract, setGipieTokenContract] = useState<ethers.Contract | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastFlipTime, setLastFlipTime] = useState<number>(0);
  const [processingCellKey, setProcessingCellKey] = useState<string | null>(null);
  const [needsShuffle, setNeedsShuffle] = useState<boolean>(true); 

  const isInitialLoadCompleteRef = useRef(false);

  const CRYPTO_PAIRS_FOR_CONTRACT_SHUFFLE: CryptoCard[] = [
    { symbol: "BTC", icon: "₿" }, { symbol: "BTC", icon: "₿" },
    { symbol: "ETH", icon: "Ξ" }, { symbol: "ETH", icon: "Ξ" },
    { symbol: "BNB", icon: "💎" }, { symbol: "BNB", icon: "💎" },
    { symbol: "SOL", icon: "☀" }, { symbol: "SOL", icon: "☀" },
    { symbol: "JOKER", icon: "🃏", isRare: true }, { symbol: "JOKER", icon: "🃏", isRare: true },
    { symbol: "BTC", icon: "₿" }, { symbol: "BTC", icon: "₿" },
    { symbol: "ETH", icon: "Ξ" }, { symbol: "ETH", icon: "Ξ" },
    { symbol: "BNB", icon: "💎" }, { symbol: "BNB", icon: "💎" },
  ];

  const prizePool = [
    { symbol: "BTC", reward: 0.015, rarity: "Common", icon: "₿" },
    { symbol: "ETH", reward: 0.03, rarity: "Rare", icon: "Ξ" },
    { symbol: "BNB", reward: 0.05, rarity: "Epic", icon: "💎" },
    { symbol: "SOL", reward: 0.075, rarity: "Legendary", icon: "☀" },
    { symbol: "JOKER", reward: 0.1, rarity: "Mystic", icon: "🃏", jackpot: true },
  ];

  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "Ready!";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }, []);

  const showMessage = useCallback((msg: string, duration = 3500) => {
    setMessage(msg);
    const timer = setTimeout(() => setMessage(null), duration);
    return () => clearTimeout(timer);
  }, []);

  const saveState = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("matchedCards", JSON.stringify(Array.from(matchedCards)));
    }
  }, [matchedCards]);

  const initializeGrid = useCallback(async () => {
    if (!contract || !signer) {
      showMessage("Connect wallet to load board.", 3000);
      setGrid([]);
      setNeedsShuffle(true);
      return;
    }
    const address = await signer.getAddress();

    try {
      const newGrid: Cell[][] = [];
      let isBoardSet = true;
      for (let i = 0; i < GRID_SIZE; i++) {
        newGrid[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
          const symbolHash = await contract.getSymbolHash(address, i, j);
          debugLog(`Debug - Symbol Hash at ${i},${j}: ${ethers.hexlify(symbolHash)}`);
          if (symbolHash === ethers.ZeroHash) {
            isBoardSet = false;
            break;
          }
          const symbolString = getSymbolFromHash(ethers.hexlify(symbolHash));
          debugLog(`Debug - Symbol at ${i},${j}: [HIDDEN]`); // Simbol disembunyikan
          const symbolMapping = SYMBOL_MAPPINGS[symbolString] || { icon: "?", isRare: false };
          newGrid[i][j] = { symbol: symbolString, icon: symbolMapping.icon, isRare: symbolMapping.isRare, row: i, col: j };
        }
        if (!isBoardSet) break;
      }

      if (!isBoardSet) {
        setGrid([]);
        setNeedsShuffle(true);
        showMessage("Board not set. Shuffle to start!", 5000);
      } else {
        setGrid(newGrid);
      }

      setFirstCard(null);
      setSecondCard(null);
      setCurrentlyOpenCards(new Set());
      saveState();
    } catch (error) {
      console.error("Error loading board:", error);
      showMessage("Failed to load board. Check console.", 5000);
      setGrid([]);
      setNeedsShuffle(true);
    } 
  }, [contract, signer, showMessage, saveState]);

  const checkPlayerStatus = useCallback(async (isPostTx = false) => {
    setIsLoading(true);
    if (!contract || !signer || !connected || !gipieTokenContract) {
      setIsLoading(false);
      setNeedsShuffle(true); 
      setCooldownSeconds(0);
      return;
    }

    const address = await signer.getAddress();
    let network;
    try {
      if (provider) {
        network = await provider.getNetwork();
        if (network.chainId !== BNB_MAINNET_CHAIN_ID) {
          showMessage("Switch to BNB Mainnet!", 3000);
          setIsLoading(false);
          setNeedsShuffle(true);
          setCooldownSeconds(0);
          return;
        }
      }
      
      const bal = await gipieTokenContract.balanceOf(address);
      const pend = await contract.getPendingRewards(address);
      const flips = await contract.getFlipsRemaining(address);
      const used = await contract.getFlipsUsed(address);
      const lastFlip = await contract.getLastFlip(address);

      const currentTime = Math.floor(Date.now() / 1000);
      const timeElapsed = lastFlip > 0 ? (currentTime - Number(lastFlip)) : COOLDOWN_PERIOD + 1;
      debugLog(`Debug - Status Check: { lastFlip: ${Number(lastFlip)}, currentTime: ${currentTime}, timeElapsed: ${timeElapsed}, flips: ${Number(flips)}, used: ${Number(used)}, isPostTx: ${isPostTx} }`);

      setBalance(ethers.formatEther(bal));
      setPendingRewards(ethers.formatEther(pend));
      setFlipsRemaining(Number(flips));
      setFlipsUsed(Number(used));
      setLastFlipTime(Number(lastFlip));

      if (Number(used) >= MAX_FLIPS_PER_PERIOD_UI) {
          if (timeElapsed >= COOLDOWN_PERIOD) {
              setCooldownSeconds(0);
              setNeedsShuffle(true);
          } else {
              setCooldownSeconds(Math.max(0, COOLDOWN_PERIOD - timeElapsed));
              setNeedsShuffle(false);
          }
      } else {
          setCooldownSeconds(0);
          setNeedsShuffle(false);
      }

      const [matchedRowsBigInt, matchedColsBigInt] = await contract.getMatchedCards(address);
      const fetchedMatchedCards = new Set<string>();
      for (let i = 0; i < matchedRowsBigInt.length; i++) {
        fetchedMatchedCards.add(`${Number(matchedRowsBigInt[i])}-${Number(matchedColsBigInt[i])}`);
      }
      setMatchedCards(fetchedMatchedCards);
      saveState();

      if (grid.length === 0 || (Number(used) === 0 && Number(lastFlip) === 0 && !isPostTx)) {
        await initializeGrid();
      }
    } catch (error) {
      console.error("Status check failed:", error);
      showMessage("Failed to load status. Check console.");
      setNeedsShuffle(true);
      setCooldownSeconds(0);
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer, connected, gipieTokenContract, showMessage, initializeGrid, provider, grid, saveState]);

  const handleTransaction = useCallback(
    async (txPromise: Promise<ethers.ContractTransactionResponse>, successMsg: string) => {
      if (!signer) {
        showMessage("Connect your wallet!");
        setIsProcessingTx(false);
        setProcessingCellKey(null);
        return null;
      }
      setIsProcessingTx(true);
      setTxStatus({ hash: null, status: "pending" });
      showMessage("Sending transaction...");
      try {
        const tx = await txPromise;
        setTxStatus({ hash: tx.hash, status: "pending" });
        const receipt = await tx.wait();
        await new Promise(resolve => setTimeout(resolve, DEBOUNCE_DELAY_AFTER_TX));

        if (receipt?.status === 1) {
          setTxStatus({ hash: tx.hash, status: "success" });
          showMessage(successMsg);
          await checkPlayerStatus(true); 
          return receipt;
        } else {
          throw new Error("Transaction reverted.");
        }
      } catch (error) {
        const err = error as TransactionError;
        console.error("Transaction Error Details:", {
          message: err.message,
          reason: err.reason,
          code: err.code,
          data: err.data,
          transactionHash: err.transactionHash,
        });
        setTxStatus({ hash: err.transactionHash || null, status: "failed" });
        const errorMessage = err.reason || err.data?.message || (err.message?.includes("revert") ? "Transaction rejected." : err.message) || "Unknown error";
        showMessage(`Failed: ${errorMessage}`);
        return null;
      } finally {
        setIsProcessingTx(false);
        setProcessingCellKey(null);
      }
    },
    [showMessage, signer, checkPlayerStatus]
  );

  const handleShuffleBoard = useCallback(async () => {
    if (!contract || !signer || isProcessingTx || isLoading) {
      showMessage("Connect wallet or wait for transaction.", 3000);
      return;
    }
    const shuffledPairs = [...CRYPTO_PAIRS_FOR_CONTRACT_SHUFFLE].sort(() => Math.random() - 0.5);
    const shuffledHashes = shuffledPairs.map(card => ethers.keccak256(ethers.toUtf8Bytes(card.symbol)));

    try {
      showMessage("Shuffling board...", 5000);
      const tx = await handleTransaction(
        contract.shuffleBoard(shuffledHashes),
        "Board shuffled successfully! You now have 6 flips."
      );
      if (tx) {
        setFlipsRemaining(MAX_FLIPS_PER_PERIOD_UI);
        setFlipsUsed(0);
        setCooldownSeconds(0); 
        setNeedsShuffle(false); 
        await initializeGrid(); 
        showMessage("Start flipping cards!", 3000);
      }
    } catch (error) {
      console.error("Shuffle failed:", error);
      const err = error as TransactionError;
      if (err.message.includes("Cooldown period not over yet.")) {
          showMessage("Shuffle failed: Cooldown period not over yet.", 7000);
      } else if (err.message.includes("Current flips not exhausted or board not ready for shuffle. Finish your current flips first.")) {
          showMessage("Shuffle failed: Finish your current flips first.", 7000);
      } else {
          showMessage("Failed to shuffle. Check gas and wallet.", 7000);
      }
    }
  }, [contract, signer, isProcessingTx, isLoading, handleTransaction, showMessage, initializeGrid]);

  const handleFlip = useCallback(
    async (row: number, col: number) => {
      const cellKey = `${row}-${col}`;

      if (isProcessingTx || processingCellKey || !contract || !signer || flipsRemaining <= 0 || needsShuffle || grid.length === 0) {
        if (!connected) showMessage("Connect wallet to play!");
        else if (cooldownSeconds > 0) showMessage(`Wait ${formatTime(cooldownSeconds)}.`);
        else if (flipsRemaining <= 0) showMessage("No flips left! Shuffle to reset.");
        else if (needsShuffle) showMessage("Shuffle to start!");
        else if (grid.length === 0) showMessage("Board not loaded. Shuffle to start!");
        return;
      }
      if (matchedCards.has(cellKey) || currentlyOpenCards.has(cellKey)) {
        showMessage(matchedCards.has(cellKey) ? "Card already matched!" : "Card already open!");
        return;
      }

      if (firstCard && secondCard) {
        setCurrentlyOpenCards(new Set());
        setFirstCard(null);
        setSecondCard(null);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setProcessingCellKey(cellKey);
      const card = grid[row]?.[col];
      if (!card) {
        setProcessingCellKey(null);
        return;
      }

      try {
        const tx = await handleTransaction(
          contract.flipCard(row, col, card.symbol),
          "Flip sent!"
        );

        if (tx) {
          setCurrentlyOpenCards(prevOpen => {
            const newOpen = new Set(prevOpen);
            newOpen.add(cellKey);
            return newOpen;
          });

          if (!firstCard) {
            setFirstCard(card);
          } else {
            setSecondCard(card);

            const playerAddress = await signer.getAddress(); 

            const eventFilter = contract.filters.CardFlipped(playerAddress);
            let flipEvent;
            let attempts = 0;
            const maxAttempts = 10;
            while (!flipEvent && attempts < maxAttempts) {
              try {
                const events = await contract.queryFilter(eventFilter, tx.blockNumber, tx.blockNumber);
                const eventLogs = events.filter(e => 'args' in e) as ethers.EventLog[];
                debugLog("Debug - Events found in block:", eventLogs.map(e => e.args));
                
                flipEvent = eventLogs.find(e => 
                  Number(e.args.row) === row && 
                  Number(e.args.col) === col &&
                  e.args.player.toLowerCase() === playerAddress.toLowerCase()
                );
              } catch (error) {
                console.error(`Debug - Retry ${attempts + 1} failed fetching event:`, error);
              }
              if (!flipEvent) {
                const delay = Math.pow(2, attempts) * 500;
                debugLog(`Debug - Retry ${attempts + 1}: No flip event found, waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              attempts++;
            }

            if (flipEvent) {
              const { isMatch, reward } = flipEvent.args as unknown as CardFlippedEvent;
              const rewardEther = ethers.formatEther(reward);

              if (isMatch) {
                showMessage(`Win! ${rewardEther} Gipie${card.isRare ? " [JACKPOT]" : ""} (Pending)!`);
                setMatchedCards(prev => {
                  const newMatched = new Set(prev);
                  if (firstCard) newMatched.add(`${firstCard.row}-${firstCard.col}`);
                  newMatched.add(cellKey);
                  return newMatched;
                });
                setCurrentlyOpenCards(new Set()); 
                setFirstCard(null);
                setSecondCard(null);
                saveState();
              } else {
                showMessage("No match! Try again.", 2000); // Notif selama 2 detik
                await new Promise(resolve => setTimeout(resolve, CARD_DISPLAY_DELAY));
                setCurrentlyOpenCards(new Set());
                setFirstCard(null);
                setSecondCard(null);
                saveState();
              }
            } else {
              debugWarn("Debug - Failed to find CardFlipped event. Relying on contract state for UI update.");
              showMessage("Flip successful, but event not received. Card state may update shortly.");
              await new Promise(resolve => setTimeout(resolve, DEBOUNCE_DELAY_AFTER_TX));
              await checkPlayerStatus(true);
              setCurrentlyOpenCards(new Set());
              setFirstCard(null);
              setSecondCard(null);
            }
          }
        }
      } catch (error) {
        const err = error as TransactionError;
        console.error("Flip failed:", err);
        showMessage(`Flip failed: ${err.reason || err.message}`);

        setCurrentlyOpenCards(prevOpen => {
          const newOpen = new Set(prevOpen);
          newOpen.delete(cellKey);
          return newOpen;
        });
        if (firstCard && !secondCard && `${firstCard.row}-${firstCard.col}` === cellKey) {
          setFirstCard(null);
        }
        setSecondCard(null); 

      } finally {
        setProcessingCellKey(null);
        await checkPlayerStatus(true); 
      }
    },
    [isProcessingTx, processingCellKey, contract, signer, flipsRemaining, cooldownSeconds, needsShuffle, grid, matchedCards, currentlyOpenCards, firstCard, secondCard, showMessage, handleTransaction, formatTime, saveState, connected, checkPlayerStatus]
  );

  const handleClaimRewards = useCallback(async () => {
    if (isProcessingTx || !contract || !signer || parseFloat(pendingRewards) <= 0) {
      showMessage("No rewards or claim in progress!");
      return;
    }
    try {
      await handleTransaction(
        contract.claimRewards(),
        "Rewards claimed!"
      );
    } catch (error) {
      if (error instanceof Error) console.error("Claim error:", error);
    }
  }, [isProcessingTx, contract, signer, pendingRewards, showMessage, handleTransaction]);

  useEffect(() => {
    if (connected && provider && signer && !isInitialized) {
      const contractInstance = new ethers.Contract(CRYPTO_CARD_GAME_CONTRACT_ADDRESS, cryptoCardGameAbi, signer);
      const gipieTokenInstance = new ethers.Contract(GIPIE_TOKEN_CONTRACT_ADDRESS, gipieTokenAbi, signer);
      setContract(contractInstance);
      setGipieTokenContract(gipieTokenInstance);
      setIsInitialized(true);
    } else if (!connected && isInitialized) {
      setContract(null);
      setGipieTokenContract(null);
      setIsInitialized(false);
      setGrid([]);
      setMatchedCards(new Set());
      setCurrentlyOpenCards(new Set());
      setFlipsRemaining(0);
      setFlipsUsed(0);
      setCooldownSeconds(0);
      setRemainingTimeDisplay("Ready!");
      setMessage(null);
      setIsProcessingTx(false);
      setTxStatus({ hash: null, status: null });
      setBalance("0.00");
      setPendingRewards("0.00");
      setFirstCard(null);
      setSecondCard(null);
      setIsLoading(true);
      setNeedsShuffle(true);
      isInitialLoadCompleteRef.current = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("matchedCards");
      }
    }
  }, [connected, provider, signer, isInitialized]);

  useEffect(() => {
    const setupGame = async () => {
      if (typeof window !== "undefined" && isInitialized && connected && !isInitialLoadCompleteRef.current) {
        isInitialLoadCompleteRef.current = true;
        const savedMatchedKeys = new Set<string>(JSON.parse(localStorage.getItem("matchedCards") || "[]"));
        setMatchedCards(savedMatchedKeys);
        
        await initializeGrid(); 
        await checkPlayerStatus(); 
      }
    };

    setupGame();
  }, [isInitialized, connected, checkPlayerStatus, initializeGrid]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            debugLog("Countdown finished, re-fetching player status from contract...");
            checkPlayerStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setRemainingTimeDisplay(formatTime(cooldownSeconds));
    return () => clearInterval(interval);
  }, [cooldownSeconds, formatTime, checkPlayerStatus]); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center py-12 px-4">
      <style jsx>{`
        @keyframes flip-card { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .animate-flip { animation: flip-card 0.5s ease-out; }
        @keyframes blur-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-blur-fade { animation: blur-fade 3.5s ease-out; }
        @keyframes loading-spin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
        .loading-spin { animation: loading-spin 1s linear infinite; }
        @keyframes countdown-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); color: #22d3ee; } 100% { transform: scale(1); color: #22d3ee; } }
        .countdown-pulse { animation: countdown-pulse 1.5s infinite; }
        .card-text { display: flex; align-items: center; justify-content: center; }
      `}</style>

      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-2 drop-shadow-lg">
            Crypto Card Flip
          </h1>
          <p className="text-gray-300 text-lg">Match cards ({MAX_FLIPS_PER_PERIOD_UI} flips/30m)</p>
          <p className="text-sm text-gray-500">Matches earn Gipie, Joker for jackpot!</p>
          <p className="text-sm text-blue-300 mt-1 font-semibold">Find two identical crypto cards to win rewards!</p>

          <div className="mt-6 border border-gray-700 rounded-lg bg-gray-900/60">
            <div className="p-4">
              <table className="w-full text-sm text-gray-300">
                <thead className="text-xs text-teal-300 uppercase bg-gray-800/80">
                  <tr className="border-b border-gray-700/50">
                    <th className="px-4 py-2 font-semibold">Rarity</th>
                    <th className="px-4 py-2 font-semibold text-right">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {prizePool.map((prize, index) => (
                    <tr key={index} className={`border-b border-gray-700/50 last:border-0 ${prize.jackpot ? "bg-emerald-500/20" : "hover:bg-gray-700/50"}`}>
                      <td className={`px-4 py-2 flex items-center ${prize.jackpot ? "font-bold text-emerald-300" : ""}`}>
                        {prize.rarity} <span className="ml-2 text-lg">{prize.icon}</span>
                        {prize.jackpot && <span className="ml-2 text-xs font-bold text-emerald-400">[JACKPOT]</span>}
                      </td>
                      <td className={`px-4 py-2 text-right ${prize.jackpot ? "font-bold text-emerald-300" : ""}`}>{prize.reward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/60 backdrop-blur-lg p-6 rounded-2xl shadow-2xl max-w-lg text-white border border-gray-700">
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <span className="text-sm text-gray-400">Gipie Balance</span>
              <div className="text-xl font-bold text-yellow-300">{isLoading ? <SkeletonLoader className="h-6 w-24 mx-auto" /> : `${balance} 🪙`}</div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <span className="text-sm text-gray-400">Flips Left</span>
              <div className="text-xl font-bold text-cyan-300">{isLoading ? <SkeletonLoader className="h-6 w-16 mx-auto" /> : `${flipsRemaining}/${MAX_FLIPS_PER_PERIOD_UI}`}</div>
            </div>
          </div>

          <div className="mb-6 bg-gray-900/50 p-4 rounded-lg text-center border border-gray-700">
            <span className="text-sm text-gray-400">Pending Rewards</span>
            <div className="text-2xl font-bold text-green-400 mb-4">{isLoading ? <SkeletonLoader className="h-8 w-32 mx-auto" /> : `${pendingRewards} 🪙`}</div>
            <button
              onClick={handleClaimRewards}
              disabled={isProcessingTx || parseFloat(pendingRewards) <= 0}
              className="py-2 px-4 rounded-lg font-bold text-md bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:scale-105 disabled:opacity-50 w-full"
            >
              {isProcessingTx ? "Claiming..." : "Claim Rewards"}
            </button>
          </div>

          {(needsShuffle || !connected || (grid.length === 0 && connected && !isLoading)) && ( 
            <div className="text-center">
              <button
                onClick={handleShuffleBoard}
                disabled={isProcessingTx || isLoading || !connected || (flipsUsed < MAX_FLIPS_PER_PERIOD_UI && lastFlipTime !== 0 && cooldownSeconds === 0)} 
                className="py-2 px-4 rounded-lg font-bold text-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:scale-105 disabled:opacity-50 w-full"
              >
                {isProcessingTx ? "Shuffling..." : "Shuffle My Board"}
              </button>
              {needsShuffle && !isLoading && connected && (
                <p className="text-yellow-400 text-sm mt-2 text-center">Shuffle to start the game or after cooldown!</p>
              )}
              {grid.length === 0 && !isLoading && connected && (
                <p className="text-yellow-400 text-sm mt-2 text-center">Board not loaded. Shuffle to start!</p>
              )}
              {flipsUsed >= MAX_FLIPS_PER_PERIOD_UI && cooldownSeconds > 0 && !isProcessingTx && (
                <p className="text-red-400 text-sm mt-2 text-center">Flips exhausted. Cooldown: {remainingTimeDisplay}</p>
              )}
              {flipsUsed < MAX_FLIPS_PER_PERIOD_UI && lastFlipTime !== 0 && cooldownSeconds === 0 && (
                <p className="text-blue-400 text-sm mt-2 text-center">Finish your current flips before shuffling.</p>
              )}
            </div>
          )}

          <div className="relative">
            <div className="bg-gray-900/60 border border-gray-700 rounded-lg overflow-hidden p-4">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {Array(GRID_SIZE).fill(null).map((_, row) =>
                  Array(GRID_SIZE).fill(null).map((_, col) => {
                    const cellKey = `${row}-${col}`;
                    const isRevealed = matchedCards.has(cellKey) || currentlyOpenCards.has(cellKey);
                    const card = grid[row]?.[col];
                    const isCurrentlyProcessingThisCell = processingCellKey === cellKey;

                    const cellClasses = `
                      relative h-16 w-full flex items-center justify-center rounded-lg cursor-pointer transition-all
                      ${isRevealed && card ? 
                        (card.isRare ? "bg-emerald-800/50 border-emerald-700" : "bg-blue-800/50 border-blue-700") : 
                        "bg-blue-600 border-blue-500 hover:bg-blue-700 active:scale-95"
                      } 
                      ${isProcessingTx || flipsRemaining <= 0 || cooldownSeconds > 0 || needsShuffle || grid.length === 0 ? "pointer-events-none opacity-80" : ""} 
                      ${isCurrentlyProcessingThisCell ? "animate-flip" : ""}
                    `;

                    return (
                      <div key={cellKey} className={cellClasses} onClick={() => handleFlip(row, col)}>
                        {!isRevealed && !isCurrentlyProcessingThisCell ? (
                          <span className="text-2xl text-blue-200">?</span> 
                        ) : isCurrentlyProcessingThisCell ? (
                          <svg className="loading-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        ) : card ? (
                          <span className="card-text text-sm font-bold text-yellow-300">{card.icon} {card.symbol}</span> 
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {cooldownSeconds > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/70 rounded-lg">
                <div className="text-4xl font-bold text-cyan-300 countdown-pulse">{remainingTimeDisplay}</div>
              </div>
            ) : needsShuffle && !isLoading && connected ? (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/70 rounded-lg">
                <p className="text-white text-xl font-bold">Shuffle to start the game!</p>
              </div>
            ) : grid.length === 0 && !isLoading && connected ? (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/70 rounded-lg">
                <p className="text-white text-xl font-bold">Board not loaded!</p>
              </div>
            ) : null}
          </div>

          {txStatus.hash && (
            <div className="mt-6 p-4 bg-gray-900/70 rounded-lg text-center border border-gray-700">
              {txStatus.status === "pending" && <div className="flex items-center justify-center space-x-3 text-yellow-300"><svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Pending...</span></div>}
              {txStatus.status === "success" && <div className="flex items-center justify-center space-x-3 text-green-400"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Success!</span></div>}
              {txStatus.status === "failed" && <div className="flex items-center justify-center space-x-3 text-red-500"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Failed</span></div>}
              {txStatus.hash && <a href={`${EXPLORER_URL}${txStatus.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 underline mt-2 block text-sm">View on BscScan</a>}
            </div>
          )}

          {message && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl border border-gray-700 z-50 animate-blur-fade"><p className="text-center">{message}</p></div>}
        </div>
      </div>
    </div>
  );
};

export default CryptoCardFlip;