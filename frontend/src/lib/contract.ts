import { createPublicClient, http, decodeAbiParameters } from "viem";
import { CHAIN, CONTRACT_ADDRESS } from "../config";

const ABI = [
  {
    name: "submit_translation",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "source_text", type: "string" },
      { name: "translation", type: "string" },
      { name: "target_lang", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claim_reward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "job_id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "get_job",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "job_id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "source_text", type: "string" },
          { name: "translation", type: "string" },
          { name: "target_lang", type: "string" },
          { name: "submitter", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "status", type: "string" },
          { name: "score", type: "uint256" },
          { name: "feedback", type: "string" },
          { name: "reasoning", type: "string" },
        ],
      },
    ],
  },
  {
    name: "list_jobs",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "limit", type: "uint256" },
      { name: "offset", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "source_text", type: "string" },
          { name: "translation", type: "string" },
          { name: "target_lang", type: "string" },
          { name: "submitter", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "status", type: "string" },
          { name: "score", type: "uint256" },
          { name: "feedback", type: "string" },
          { name: "reasoning", type: "string" },
        ],
      },
    ],
  },
  {
    name: "get_stats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "total_jobs", type: "uint256" },
          { name: "total_paid", type: "uint256" },
          { name: "pending", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(CHAIN.rpcUrls.default.http[0]),
});

export async function readContract<T>(functionName: string, args: readonly unknown[] = []): Promise<T> {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: functionName as any,
    args: args as any,
  }) as Promise<T>;
}

function ensureHexPrefix(hash: string): string {
  if (hash.startsWith("0x")) {
    return hash;
  }
  return "0x" + hash;
}

export async function writeContract(
  walletClient: any,
  functionName: string,
  args: any[] = [],
  value: bigint = 0n
): Promise<string> {
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName,
    args,
    value,
  });
  const prefixed = hash.startsWith("0x") ? hash : "0x" + hash;
  return prefixed as unknown as string;
}

export async function writeContractAndDecode<T>(
  walletClient: any,
  functionName: string,
  args: any[] = [],
  value: bigint = 0n
): Promise<T> {
  const hash = await writeContract(walletClient, functionName, args, value);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });

  const funcAbi = ABI.find(item => item.name === functionName && item.type === "function");
  if (!funcAbi || !funcAbi.outputs) {
    throw new Error(`No output ABI found for ${functionName}`);
  }

  const output = (receipt as any).output || (receipt as any).returnValue;
  if (!output) {
    throw new Error("No return value in transaction receipt");
  }

  return decodeAbiParameters(funcAbi.outputs, output) as T;
}

export async function waitForTransaction(hash: string) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export function getExplorerUrl(hash: string): string {
  return `${CHAIN.blockExplorers?.default?.url}/tx/${hash}`;
}