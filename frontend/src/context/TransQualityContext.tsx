import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { switchToStudionet } from "../lib/client";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface TransQualityContextType {
  account: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  jobs: any[];
  stats: { total_jobs: number; total_paid: number; pending: number };
  loading: boolean;
  error: string | null;
  toasts: Toast[];
  addToast: (message: string, type: "success" | "error" | "info") => void;
  removeToast: (id: number) => void;
  fetchJobs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  submitTranslation: (source: string, translation: string, targetLang: string) => Promise<void>;
  claimReward: (jobId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const TransQualityContext = createContext<any>(null);

export function TransQualityProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_jobs: 0, total_paid: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchJobsData = useCallback(async () => {
    const { readContract } = await import("../lib/contract");
    const jobsData = await readContract<any[]>("list_jobs", [10n, 0n]);
    return jobsData.map((j: any) => ({
      id: Number(j.id),
      source_text: j.source_text,
      translation: j.translation,
      target_lang: j.target_lang,
      submitter: j.submitter,
      timestamp: Number(j.timestamp),
      status: j.status,
      score: Number(j.score),
      feedback: j.feedback,
      reasoning: j.reasoning,
    }));
  }, []);

  const fetchStatsData = useCallback(async () => {
    const { readContract } = await import("../lib/contract");
    const statsData = await readContract<any>("get_stats");
    return {
      total_jobs: Number(statsData.total_jobs),
      total_paid: Number(statsData.total_paid),
      pending: Number(statsData.pending),
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await switchToStudionet();
      const { getAccount } = await import("../lib/client");
      const addr = await getAccount();
      setAccount(addr);
      const jobs = await fetchJobsData();
      const stats = await fetchStatsData();
      setJobs(jobs);
      setStats(stats);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setJobs([]);
    setStats({ total_jobs: 0, total_paid: 0, pending: 0 });
  }, []);

  const fetchJobsState = useCallback(async () => {
    const jobs = await fetchJobsData();
    setJobs(jobs);
  }, []);

  const fetchStatsState = useCallback(async () => {
    const stats = await fetchStatsData();
    setStats(stats);
  }, []);

  const submitTranslation = useCallback(async (source: string, translation: string, targetLang: string) => {
    const { getWalletClient } = await import("../lib/client");
    const { writeContract, waitForTransaction } = await import("../lib/contract");
    const client = await getWalletClient();
    const hash = await writeContract(client, "submit_translation", [source, translation, targetLang], 10n ** 16n);
    await waitForTransaction(hash);
    const jobs = await fetchJobsData();
    setJobs(jobs);
    const stats = await fetchStatsData();
    setStats(stats);
  }, []);

  const claimReward = useCallback(async (jobId: number) => {
    const { getWalletClient } = await import("../lib/client");
    const { writeContract, waitForTransaction } = await import("../lib/contract");
    const client = await getWalletClient();
    const hash = await writeContract(client, "claim_reward", [BigInt(jobId)]);
    await waitForTransaction(hash);
    const jobs = await fetchJobsData();
    setJobs(jobs);
    const stats = await fetchStatsData();
    setStats(stats);
  }, []);

  const refresh = useCallback(async () => {
    const jobs = await fetchJobsData();
    setJobs(jobs);
    const stats = await fetchStatsData();
    setStats(stats);
  }, []);

  const value = {
    account,
    isConnected: !!account,
    connect,
    disconnect,
    jobs,
    stats,
    loading,
    error,
    toasts: [],
    addToast: () => {},
    removeToast: () => {},
    fetchJobs: async () => { const j = await fetchJobsData(); setJobs(j); },
    fetchStats: async () => { const s = await fetchStatsData(); setStats(s); },
    submitTranslation,
    claimReward,
    refresh: async () => { const j = await fetchJobsData(); setJobs(j); const s = await fetchStatsData(); setStats(s); },
  };

  return (
    <TransQualityContext.Provider value={value}>
      {children}
    </TransQualityContext.Provider>
  );
}

export function useTransQuality() {
  const ctx = useContext(TransQualityContext);
  if (!ctx) throw new Error("useTransQuality must be used within TransQualityProvider");
  return ctx;
}