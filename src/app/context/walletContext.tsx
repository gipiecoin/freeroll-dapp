"use client";

import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useAccount, useBalance, useDisconnect, useConnectorClient } from "wagmi";
import { ethers, BrowserProvider } from "ethers";
import type { Account, Chain, Client, Transport } from 'viem';

// --- Configuration from your project ---
const GIPIE_TOKEN_ADDRESS = "0x03285a2F201AC1c00E51b77b0A55F139f3A7D591";
// We assume the main target is BNB Smart Chain
const TARGET_CHAIN_ID = 56;

// --- Helper Function to convert wagmi client to ethers signer ---
export function walletClientToSigner(walletClient: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new ethers.JsonRpcSigner(provider, account.address);
  return signer;
}

// --- Context Data Type (Mimicking your old structure) ---
interface WalletContextType {
  connected: boolean;
  walletAddress: string;
  balance: string;       // GIPIE balance
  ethBalance: string;    // Native chain balance (BNB in this case)
  connectWallet: () => void; // Will be an empty function, handled by RainbowKit
  disconnectWallet: () => void;
  provider: ethers.BrowserProvider | null; // Kept for compatibility
  signer: ethers.JsonRpcSigner | null;
  // selectedNetwork and setNetwork are no longer needed, handled by RainbowKit
  walletReady: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // --- The New Core (Using Hooks from Wagmi) ---
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useConnectorClient();

  // 1. Create signer & provider from wagmi (if connected)
  const { signer, provider } = useMemo(() => {
    if (!walletClient) return { signer: null, provider: null }; // Ensure proper null initialization
    try {
      const newSigner = walletClientToSigner(walletClient);
      const newProvider = newSigner.provider as BrowserProvider;
      return { signer: newSigner, provider: newProvider };
    } catch (error) {
      console.error("Error creating signer/provider:", error);
      return { signer: null, provider: null }; // Fallback to null if error occurs
    }
  }, [walletClient]);

  // 2. Determine connection status
  const connected = isConnected && chain?.id === TARGET_CHAIN_ID;
  const walletReady = !isConnecting; // Wallet is ready if it's not in the process of connecting

  // 3. Fetch balances (GIPIE and native) using wagmi
  const { data: gipieBalanceData } = useBalance({
    address,
    token: GIPIE_TOKEN_ADDRESS,
    query: { enabled: connected }, // Only fetch if connected on the correct network
  });

  const { data: nativeBalanceData } = useBalance({
    address,
    query: { enabled: connected },
  });

  // --- Providing Data (Mimicking the Old Structure) ---
  const value: WalletContextType = {
    connected: !!connected, // Ensure it's a boolean
    walletAddress: address || "",
    balance: gipieBalanceData?.formatted || "0.0",
    ethBalance: nativeBalanceData?.formatted || "0.0", // Native balance (BNB)
    connectWallet: () => {
      // This function no longer does anything, as it's handled by the RainbowKit button.
      console.log("Please use the 'Connect Wallet' button provided by RainbowKit.");
    },
    disconnectWallet: () => {
      // Call the disconnect function from wagmi
      disconnect();
    },
    provider,
    signer,
    walletReady,
    // selectedNetwork and setNetwork are not included as they are handled by RainbowKit.
    // However, if other components need them, they can be derived from wagmi's `chain` object.
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}