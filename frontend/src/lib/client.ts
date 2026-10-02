import { createWalletClient, custom, parseEther, type Address } from "viem";
import { switchChain } from "viem/actions";
import { CHAIN } from "../config";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Install MetaMask or another Web3 wallet.");
  }
  return createWalletClient({
    chain: CHAIN,
    transport: custom(window.ethereum),
  });
}

export async function getAccount(): Promise<Address> {
  const client = await getWalletClient();
  const [account] = await client.getAddresses();
  return account;
}

export function parseWei(eth: string): bigint {
  return parseEther(eth);
}

export function shortenAddress(addr: Address): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function switchToStudionet() {
  const client = await getWalletClient();
  try {
    await switchChain(client, { id: CHAIN.id });
  } catch {
    // Chain not added, will prompt user
  }
}