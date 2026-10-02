export interface TranslationJob {
  id: number;
  source_text: string;
  translation: string;
  target_lang: string;
  submitter: string;
  timestamp: number;
  status: "PENDING" | "JUDGED" | "PAID";
  score: number;
  feedback: string;
  reasoning: string;
}

export interface QualityResult {
  job_id: number;
  score: number;
  accuracy: number;
  fluency: number;
  terminology: number;
  feedback: string;
  reasoning: string;
}

export interface Stats {
  total_jobs: number;
  total_paid: number;
  pending: number;
}

export type TransactionStatus = "idle" | "pending" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}