import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTransQuality } from "../context/TransQualityContext";
import { shortHex, formatClock, untilClock } from "../config";

export function JobDetailPage() {
  const { claimReward, isConnected, account } = useTransQuality();
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    const fetchJob = async () => {
      try {
        setJobLoading(true);
        const { readContract } = await import("../lib/contract");
        const jobData = await readContract<any>("get_job", [BigInt(params.id!)]);
        if (jobData && jobData.id) {
          setJob({
            id: Number(jobData.id),
            source_text: jobData.source_text,
            translation: jobData.translation,
            target_lang: jobData.target_lang,
            submitter: jobData.submitter,
            timestamp: Number(jobData.timestamp),
            status: jobData.status,
            score: Number(jobData.score),
            feedback: jobData.feedback,
            reasoning: jobData.reasoning,
          });
        } else {
          setJob(null);
        }
      } catch (err) {
        console.error("Failed to load job:", err);
        setJob(null);
      } finally {
        setJobLoading(false);
      }
    };
    fetchJob();
  }, [params.id]);

  const handleClaim = async () => {
    if (!job) return;
    try {
      setClaimLoading(true);
      await claimReward(job.id);
      // Refetch to update status
      const { readContract } = await import("../lib/contract");
      const jobData = await readContract<any>("get_job", [BigInt(params.id!)]);
      if (jobData) {
        setJob({
          id: Number(jobData.id),
          source_text: jobData.source_text,
          translation: jobData.translation,
          target_lang: jobData.target_lang,
          submitter: jobData.submitter,
          timestamp: Number(jobData.timestamp),
          status: jobData.status,
          score: Number(jobData.score),
          feedback: jobData.feedback,
          reasoning: jobData.reasoning,
        });
      }
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setClaimLoading(false);
    }
  };

  if (jobLoading) {
    return <div style={styles.loading}>Loading job details...</div>;
  }

  if (!job) {
    return (
      <div style={styles.error}>
        <h2>Job Not Found</h2>
        <p>This translation job does not exist or has been removed.</p>
        <Link to="/" style={styles.backLink}>← Back to Board</Link>
      </div>
    );
  }

  const canClaim = isConnected && account === job.submitter && job.status === "JUDGED";

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← Back to Board</Link>

      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Translation #{job.id}</h1>
            <span style={{ ...styles.status, ...statusStyles[job.status] }}>{job.status}</span>
          </div>
          {canClaim && (
            <button onClick={handleClaim} disabled={claimLoading} style={styles.claimBtn}>
              {claimLoading ? "Claiming..." : "Claim Reward"}
            </button>
          )}
        </header>

        <div style={styles.meta}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Target Language</span>
            <span style={styles.metaValue}>{job.target_lang}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Submitter</span>
            <span style={styles.metaValue}>{shortHex(job.submitter)}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Submitted</span>
            <span style={styles.metaValue}>{formatClock(job.timestamp)}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Time Remaining</span>
            <span style={styles.metaValue}>{untilClock(job.timestamp + 86400)}</span>
          </div>
        </div>

        {job.status === "JUDGED" || job.status === "PAID" ? (
          <div style={styles.scoreCard}>
            <h3 style={styles.scoreTitle}>Quality Assessment</h3>
            <div style={styles.scoreValue}>{job.score}/100</div>
            <div style={styles.scoreLabel}>Overall Quality Score</div>
          </div>
        ) : null}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Source Text</h3>
          <pre style={styles.code}>{job.source_text}</pre>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Translation</h3>
          <pre style={styles.code}>{job.translation}</pre>
        </div>

        {job.feedback && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Feedback</h3>
            <div style={styles.feedback}>{job.feedback}</div>
          </div>
        )}

        {job.reasoning && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Judge Reasoning</h3>
            <div style={styles.reasoning}>{job.reasoning}</div>
          </div>
        )}

        <div style={styles.footer}>
          <Link to="/" style={styles.backLink}>← Back to Board</Link>
        </div>
      </div>
    </div>
  );
}

const statusStyles: Record<string, React.CSSProperties> = {
  PENDING: { background: "#fff3e0", color: "#e65100" },
  JUDGED: { background: "#e3f2fd", color: "#1565c0" },
  PAID: { background: "#e8f5e9", color: "#2e7d32" },
};

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "800px", margin: "0 auto", padding: "24px" },
  loading: { textAlign: "center", padding: "48px", color: "#666" },
  error: { textAlign: "center", padding: "48px", color: "#c62828" },
  backLink: { display: "inline-block", marginBottom: "24px", color: "#1976d2", textDecoration: "none", fontWeight: 500 },
  card: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px", borderBottom: "1px solid #e0e0e0" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  title: { margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 600 },
  status: { padding: "6px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" },
  claimBtn: { padding: "10px 20px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 500, cursor: "pointer" },
  meta: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", padding: "20px 24px", borderBottom: "1px solid #e0e0e0", background: "#fafafa" },
  metaItem: { display: "flex", flexDirection: "column", gap: "4px" },
  metaLabel: { fontSize: "0.75rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" },
  metaValue: { fontSize: "0.95rem", color: "#333", fontWeight: 500 },
  scoreCard: { background: "#e3f2fd", margin: "20px 24px", padding: "20px", borderRadius: "12px", textAlign: "center" },
  scoreTitle: { margin: "0 0 8px", fontSize: "0.9rem", color: "#1565c0", textTransform: "uppercase", letterSpacing: "0.5px" },
  scoreValue: { fontSize: "3rem", fontWeight: 700, color: "#1565c0" },
  scoreLabel: { fontSize: "0.85rem", color: "#1565c0" },
  section: { padding: "20px 24px", borderBottom: "1px solid #e0e0e0" },
  sectionTitle: { margin: "0 0 12px", fontSize: "1rem", fontWeight: 600, color: "#333" },
  code: { margin: 0, padding: "16px", background: "#f5f5f5", borderRadius: "8px", whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "inherit", lineHeight: 1.6, fontSize: "0.95rem", color: "#333" },
  feedback: { padding: "12px", background: "#fff3e0", borderRadius: "8px", color: "#e65100", lineHeight: 1.6 },
  reasoning: { padding: "12px", background: "#e8f5e9", borderRadius: "8px", color: "#2e7d32", lineHeight: 1.6 },
  footer: { padding: "20px 24px", borderTop: "1px solid #e0e0e0" },
};