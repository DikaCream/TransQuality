import { studionet } from "genlayer-js/chains";

declare global {
  interface ImportMetaEnv {
    VITE_CONTRACT_ADDRESS?: string;
  }
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

export const CHAIN = studionet;
export const CHAIN_ID = studionet.id;
export const CHAIN_ID_HEX = "0x" + studionet.id.toString(16);
export const CHAIN_NAME = studionet.name;
export const RPC_URL = (studionet.rpcUrls?.default?.http?.[0] as string) ?? "";

export const CONTRACT_ADDRESS =
  (import.meta.env?.VITE_CONTRACT_ADDRESS as string) || "0x0000000000000000000000000000000000000000";

export const isConfigured = (): boolean => /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

export const EXPLORER_TX = (hash: string) => `https://explorer-studio.genlayer.com/tx/${hash}`;
export const EXPLORER_ADDR = (address: string) => `https://explorer-studio.genlayer.com/address/${address}`;

export const REPO_URL = "https://github.com/DikaCream/TransQuality";
export const CONTRACT_SOURCE_URL = "https://raw.githubusercontent.com/DikaCream/TransQuality/main/contracts/trans_quality.py";

export const GEN = 10n ** 18n;
export const MIN_FEE = GEN / 100n; // 0.01 GEN

export function toBigInt(value: bigint | number | string | null | undefined): bigint {
  try {
    if (typeof value === "bigint") return value;
    if (value === null || value === undefined) return 0n;
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export function formatGen(value: bigint | number | string, maxDecimals = 4): string {
  let wei = toBigInt(value);
  const negative = wei < 0n;
  if (negative) wei = -wei;
  const scale = 10n ** BigInt(maxDecimals);
  const whole = wei / GEN;
  const frac = ((wei % GEN) * scale) / GEN;
  const fracStr = frac.toString().padStart(maxDecimals, "0").replace(/0+$/, "");
  if (whole === 0n) {
    if (fracStr === "") return wei === 0n ? "0" : `<0.${"0".repeat(maxDecimals - 1)}1`;
    return `${negative ? "-" : ""}0.${fracStr}`;
  }
  return `${negative ? "-" : ""}${whole}${fracStr ? `.${fracStr}` : ""}`;
}

export function shortHex(a: string, lead = 6, tail = 4): string {
  if (!a) return "";
  const hex = a.startsWith("addr#") ? "0x" + a.slice(5) : a;
  if (hex.length <= lead + tail + 3) return hex;
  return `${hex.slice(0, lead)}...${hex.slice(-tail)}`;
}

export function shortAddr(a: string): string {
  return shortHex(a);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatClock(unix: number): string {
  if (!unix) return "n/a";
  const d = new Date(unix * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function untilClock(unix: number, nowSec = Math.floor(Date.now() / 1000)): string {
  const s = unix - nowSec;
  if (s <= 0) return "passed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}