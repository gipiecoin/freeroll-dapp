"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { ethers } from "ethers";

// Import configurations from your project's config file
import { networks, NetworkConfig, defaultNetwork } from "../../config/networks";
import TesterABI from "../abi/TesterABI.json"; // Import your TesterABI for GIPIE token

const GIPIE_TOKEN_ADDRESS = "0x03285a2F201AC1c00E51b77b0A55F139f3A7D591"; // Your Tester contract address for GIPIE token

// Define WalletContextType to include both GIPIE and ETH balances
interface WalletContextType {
  connected: boolean;
  walletAddress: string;
  balance: string; // Represents GIPIE balance
  ethBalance: string; // Native ETH balance
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  selectedNetwork: NetworkConfig;
  setNetwork: (network: NetworkConfig) => Promise<void>;
  walletReady: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0.0"); // GIPIE Balance
  const [ethBalance, setEthBalance] = useState<string>("0.0"); // Native ETH Balance
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig>(defaultNetwork);
  const [walletReady, setWalletReady] = useState<boolean>(false);

  const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
  const LAST_CONNECTION_KEY = "lastWalletConnection";

  const saveConnectionState = useCallback((address: string, chainId: string) => {
    localStorage.setItem(
      LAST_CONNECTION_KEY,
      JSON.stringify({
        address,
        chainId,
        timestamp: Date.now(),
      })
    );
  }, []);

  const clearConnectionState = useCallback(() => {
    localStorage.removeItem(LAST_CONNECTION_KEY);
  }, []);

  const loadConnectionState = useCallback(() => {
    try {
      const stored = localStorage.getItem(LAST_CONNECTION_KEY);
      if (stored) {
        const { address, chainId, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < SESSION_DURATION_MS) {
          return { address, chainId };
        } else {
          clearConnectionState();
        }
      }
    } catch (error: unknown) {
      console.error("Failed to load connection state:", error instanceof Error ? error.message : error);
      clearConnectionState();
    }
    return null;
  }, [clearConnectionState, SESSION_DURATION_MS]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);

        const accounts = await browserProvider.send("eth_requestAccounts", []);
        if (accounts.length === 0) {
          throw new Error("No accounts found. Please connect to MetaMask.");
        }
        const signerInstance = await browserProvider.getSigner();

        setWalletAddress(accounts[0]);
        setSigner(signerInstance);
        setConnected(true);

        const currentNetwork = await browserProvider.getNetwork();
        const networkConfig = networks.find(
          (net) => Number(net.chainId) === Number(currentNetwork.chainId)
        );
        if (networkConfig) {
          setSelectedNetwork(networkConfig);
        } else {
          console.warn(`Connected to unsupported network: Chain ID ${currentNetwork.chainId}`);
        }
        saveConnectionState(accounts[0], String(currentNetwork.chainId));
      } catch (error: unknown) {
        console.error("Error connecting wallet:", error);
        setConnected(false);
        clearConnectionState();
        if (error instanceof Error && "code" in error && error.code === 4001) {
          console.log("Wallet connection rejected by user.");
        } else {
          console.error(`Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } else {
      console.warn("MetaMask is not installed. Please install it to use this dApp.");
    }
  };

  const disconnectWallet = useCallback(() => {
    setConnected(false);
    setWalletAddress("");
    setBalance("0.0");
    setEthBalance("0.0");
    setProvider(null);
    setSigner(null);
    clearConnectionState();
  }, [clearConnectionState]);

  // Function to fetch ERC20 token balance
  const fetchgipieBalance = async (
    currentProvider: ethers.BrowserProvider,
    address: string
  ) => {
    try {
      const tokenContract = new ethers.Contract(
        GIPIE_TOKEN_ADDRESS,
        TesterABI,
        currentProvider
      );
      if (!tokenContract.balanceOf) {
        throw new Error("Contract does not have balanceOf function. Check ABI or address.");
      }
      const tokenBalanceWei = await tokenContract.balanceOf(address);
      return ethers.formatUnits(tokenBalanceWei, 18);
    } catch (error: unknown) {
      console.error("Error fetching GIPIE token balance:", error instanceof Error ? error.message : error);
      return "0.0";
    }
  };

  // Function to fetch native ETH balance
  const fetchEthBalance = async (
    currentProvider: ethers.BrowserProvider,
    address: string
  ) => {
    try {
      const nativeBalanceWei = await currentProvider.getBalance(address);
      return ethers.formatEther(nativeBalanceWei);
    } catch (error: unknown) {
      console.error("Error fetching ETH balance:", error instanceof Error ? error.message : error);
      return "0.0";
    }
  };

  const setNetwork = async (network: NetworkConfig) => {
    if (!window.ethereum) {
      console.warn("MetaMask is not installed. Please install it to use this dApp.");
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ethers.toBeHex(Number(network.chainId)) }],
      });
      setSelectedNetwork(network);
    } catch (switchError: unknown) {
      console.error("Failed to switch network:", switchError);
      if (
        switchError instanceof Error &&
        "code" in switchError &&
        switchError.code === 4902
      ) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ethers.toBeHex(Number(network.chainId)),
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: [network.explorerUrl],
              },
            ],
          });
          await setNetwork(network);
        } catch (addError: unknown) {
          console.error("Failed to add network:", addError instanceof Error ? addError.message : addError);
          console.error("Failed to add network to MetaMask. Please add it manually.");
        }
      } else {
        console.error("Failed to switch network. Please try again.");
      }
    }
  };

  // Effect to handle initial connection attempt and event listeners
  useEffect(() => {
    if (typeof window.ethereum === "undefined") {
      setWalletReady(true);
      return;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);

    const attemptAutoConnect = async () => {
      const storedConnection = loadConnectionState();
      if (storedConnection) {
        try {
          const accounts = await browserProvider.send("eth_accounts", []);
          if (
            accounts.length > 0 &&
            accounts[0].toLowerCase() === storedConnection.address.toLowerCase()
          ) {
            const currentNetwork = await browserProvider.getNetwork();
            if (String(currentNetwork.chainId) === storedConnection.chainId) {
              setProvider(browserProvider);
              setSigner(await browserProvider.getSigner());
              setWalletAddress(accounts[0]);
              setConnected(true);
              const networkConfig = networks.find(
                (net) => net.chainId === storedConnection.chainId
              );
              if (networkConfig) {
                setSelectedNetwork(networkConfig);
              }
            } else {
              console.warn("Stored network mismatch. Please switch to the correct network.");
              clearConnectionState();
            }
          } else {
            console.log("No active accounts or address mismatch. Requiring manual connect.");
            clearConnectionState();
          }
        } catch (error: unknown) {
          console.error("Error during auto-connect:", error instanceof Error ? error.message : error);
          clearConnectionState();
        }
      }
      setWalletReady(true);
    };
    attemptAutoConnect();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWalletAddress(accounts[0]);
        const currentSigner = await browserProvider.getSigner();
        setSigner(currentSigner);
        setConnected(true);
        const currentNetwork = await browserProvider.getNetwork();
        saveConnectionState(accounts[0], String(currentNetwork.chainId));
      }
    };

    const handleChainChanged = async (chainId: string) => {
      const newChainId = String(Number(chainId));
      const networkConfig = networks.find((net) => net.chainId === newChainId);
      if (networkConfig) {
        setSelectedNetwork(networkConfig);
        setProvider(browserProvider);
        const currentSigner = await browserProvider.getSigner();
        setSigner(currentSigner);
        if (connected && walletAddress) {
          saveConnectionState(walletAddress, newChainId);
        }
      } else {
        console.warn(`Switched to unsupported network: Chain ID ${newChainId}`);
        disconnectWallet();
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [connected, walletAddress, disconnectWallet, loadConnectionState, saveConnectionState, clearConnectionState]);

  // Effect to update balances (both GIPIE and native ETH)
  useEffect(() => {
    const fetchAllBalances = async () => {
      if (connected && provider && walletAddress) {
        try {
          // Fetch GIPIE token balance
          const gipieBalance = await fetchgipieBalance(provider, walletAddress);
          setBalance(gipieBalance);

          // Fetch native ETH balance
          const nativeEthBalance = await fetchEthBalance(provider, walletAddress);
          setEthBalance(nativeEthBalance);
        } catch (error: unknown) {
          console.error("Error fetching balances:", error instanceof Error ? error.message : error);
          setBalance("0.0");
          setEthBalance("0.0");
        }
      } else {
        setBalance("0.0");
        setEthBalance("0.0");
      }
    };

    if (connected && walletReady) {
      fetchAllBalances();
      const balanceInterval = setInterval(fetchAllBalances, 10000);
      return () => clearInterval(balanceInterval);
    } else {
      setBalance("0.0");
      setEthBalance("0.0");
    }
  }, [connected, provider, walletAddress, selectedNetwork, walletReady]);

  const value = {
    connected,
    walletAddress,
    balance,
    ethBalance,
    connectWallet,
    disconnectWallet,
    provider,
    signer,
    selectedNetwork,
    setNetwork,
    walletReady,
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