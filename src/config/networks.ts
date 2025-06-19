// src/config/networks.ts

// The interface remains the same
export interface NetworkConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  // NOTE: I see you have contractAddress here.
  // This is a good pattern, but make sure other components read from here.
  // The addresses I provided in Freeroll.js were constants.
  // You should decide on one single source of truth.
  // For now, I'll update this file as requested.
  contractAddress: string; 
  explorerUrl: string;
}

// The 'networks' array now ONLY contains BNB Smart Chain.
export const networks: NetworkConfig[] = [
  {
    chainId: "56", // Chain ID for BSC Mainnet
    name: "BNB Smart Chain",
    // It's highly recommended to replace this public RPC with a dedicated one from Alchemy or Infura for better performance on mainnet.
    rpcUrl: "https://bsc-dataseed.binance.org/",
    // IMPORTANT: Replace this placeholder with your NEWLY deployed Freeroll contract address on BSC.
    contractAddress: "YOUR_NEW_FREEROLL_CONTRACT_ADDRESS_ON_BSC",
    explorerUrl: "https://bscscan.com/", // The base URL for the explorer
  },
];

// The defaultNetwork now automatically points to BNB Smart Chain as it's the only one.
export const defaultNetwork = networks[0];