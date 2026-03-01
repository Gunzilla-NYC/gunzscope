import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    gunzchain: {
      url: "https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc",
      chainId: 43419,
      accounts: [DEPLOYER_KEY],
    },
    gunzchainTestnet: {
      url: "https://rpc.gunz.dev/ext/bc/ryk9vkvNuKtewME2PeCgybo9sdWXGmCkBrrx4VPuZPdVdAak8/rpc",
      chainId: 49321,
      accounts: [DEPLOYER_KEY],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [DEPLOYER_KEY],
    },
    avalanche: {
      url: "https://avalanche-c-chain-rpc.publicnode.com",
      chainId: 43114,
      accounts: [DEPLOYER_KEY],
    },
  },
  etherscan: {
    apiKey: {
      avalanche: "verifyContract",
    },
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api",
          browserURL: "https://snowtrace.io",
        },
      },
    ],
  },
};

export default config;
