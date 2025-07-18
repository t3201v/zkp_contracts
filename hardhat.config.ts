import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@nomicfoundation/hardhat-verify';

dotenv.config();

const DEFAULT_MNEMONIC = 'test test test test test test test test test test test junk';

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.27',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    // main: {
    //   chainId: 137,
    //   url: `${process.env.MAIN_RPC_URL}`,
    //   accounts: [`0x${process.env.MAIN_PRIVATE_KEY}`],
    //   gasPrice: 200000000000
    // },
    amoy: {
      chainId: 80002,
      url: `${process.env.AMOY_RPC_URL}`,
      accounts: [`0x${process.env.AMOY_PRIVATE_KEY}`]
    },
    // 'linea-sepolia': {
    //   chainId: 59141,
    //   url: `${process.env.LINEA_SEPOLIA_RPC_URL}`,
    //   accounts: [`0x${process.env.LINEA_SEPOLIA_PRIVATE_KEY}`]
    // },
    // linea: {
    //   chainId: 59144,
    //   url: `${process.env.LINEA_RPC_URL}`,
    //   accounts: [`0x${process.env.LINEA_PRIVATE_KEY}`]
    // },
    'u2u-testnet': {
      chainId: 2484,
      url: `${process.env.U2U_TESTNET_RPC_URL}`,
      accounts: [`0x${process.env.U2U_TESTNET_PRIVATE_KEY}`]
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts: {
        mnemonic: DEFAULT_MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20
      }
    }
  },
  etherscan: {
    apiKey: {
      linea: process.env.LINEA_API_KEY,
      'linea-sepolia': process.env.LINEA_API_KEY,
      amoy: process.env.AMOY_API_KEY,
      'u2u-testnet': process.env.U2U_TESTNET_API_KEY
    },
    customChains: [
      {
        network: 'amoy',
        chainId: 80002,
        urls: {
          apiURL:
            'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com'
        }
      },
      {
        network: 'linea-sepolia',
        chainId: 59141,
        urls: {
          apiURL: 'https://api-sepolia.lineascan.build/api',
          browserURL: 'https://sepolia.lineascan.build'
        }
      },
      {
        network: 'linea',
        chainId: 59144,
        urls: {
          apiURL: 'https://api.lineascan.build/api',
          browserURL: 'https://lineascan.build'
        }
      },
        {
        network: 'u2u-testnet',
        chainId: 2484,
        urls: {
          apiURL: 'https://testnet.u2uscan.xyz/api',
          browserURL: 'https://testnet.u2uscan.xyz'
        }
      }
    ]
  },
  gasReporter: {
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_KEY,
    enabled: !!process.env.REPORT_GAS,
    token: 'MATIC'
  }
};

export default config;
