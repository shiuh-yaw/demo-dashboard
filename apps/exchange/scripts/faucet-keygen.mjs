// Prints a fresh treasury key for the live-mode faucet. Run once, put the key
// in apps/exchange/.env as FAUCET_PRIVATE_KEY, fund the address, never commit it.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
const key = generatePrivateKey();
const { address } = privateKeyToAccount(key);
console.log(`FAUCET_PRIVATE_KEY=${key}`);
console.log(`# treasury address: ${address}`);
console.log("# fund it: USDC from https://faucet.circle.com (Ethereum Sepolia), ETH from https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
