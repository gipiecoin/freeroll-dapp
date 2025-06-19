// src/config/networks.ts
export interface NetworkConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  explorerUrl: string;
}

export const networks: NetworkConfig[] = [
  {
    chainId: "11155111",
    name: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    contractAddress: "0xYour_Sepolia_Contract_Address",
    explorerUrl: "https://sepolia.etherscan.io/tx/",
  },
  {
    chainId: "1",
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/your_infura_project_id",
    contractAddress: "0xYour_Ethereum_Mainnet_Contract_Address",
    explorerUrl: "https://etherscan.io/tx/",
  },
  {
    chainId: "56",
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    contractAddress: "0xYour_BSC_Contract_Address",
    explorerUrl: "https://bscscan.com/tx/",
  },
  {
    chainId: "8453",
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    contractAddress: "0xYour_Base_Contract_Address",
    explorerUrl: "https://basescan.org/tx/",
  },
];

export const defaultNetwork = networks[0];