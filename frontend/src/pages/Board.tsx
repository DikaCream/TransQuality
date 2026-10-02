import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTransQuality } from "../context/TransQualityContext";
import { formatGen, shortHex, untilClock, MIN_FEE } from "../config";

export function Board() {
  const { jobs, stats, loading, fetchJobs, fetchStats, connect, isConnected, account } = useTransQuality();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchJobs();
      fetchStats();
    }
  }, [isConnected, fetchJobs, fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    await fetchStats();
    setRefreshing(false);
  };

  if (!isConnected) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h2 style={styles.title}>TransQuality</h2>
          <p style={styles.subtitle}>Translation Quality Oracle on GenLayer</p>
          <p style={styles.desc}>
            Submit translations for quality assessment powered by LLM consensus.
            Minimum fee: {formatGen(MIN_FEE)} GEN per submission.
          </p>
          <button onClick={connect} disabled={loading} style={styles.connectBtn}>
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>TransQuality</h1>
          <span style={styles.badge}>Translation Quality Oracle</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.wallet}>
            {shortHex(account!)} • {formatGen(MIN_FEE)} GEN/fee
          </span>
          <button onClick={handleRefresh} disabled={refreshing} style={styles.refreshBtn}>
            {refreshing ? "⟳" : "↻"} Refresh
          </button>
        </div>
      </header>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.total_jobs}</span>
          <span style={styles.statLabel}>Total Jobs</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.pending}</span>
          <span style={styles.statLabel}>Pending</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.total_paid}</span>
          <span style={styles.statLabel}>Completed</span>
        </div>
      </div>

      <div style={styles.actions}>
        <Link to="/submit" style={styles.submitBtn}>
          + Submit Translation
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div style={styles.empty}>
          <p>No translations submitted yet.</p>
          <Link to="/submit" style={styles.link}>
            Be the first to submit a translation for quality check!
          </Link>
        </div>
      ) : (
        <div style={styles.list}>
          {jobs.map((job: any) => (
            <Link to={`/job/${job.id}`} key={job.id} style={styles.jobCard}>
              <div style={styles.jobHeader}>
                <span style={styles.jobId}>#{job.id}</span>
                <span style={{ ...styles.status, ...statusStyles[job.status] }}>{job.status}</span>
              </div>
              <div style={styles.jobMeta}>
                <span>🌐 {job.target_lang}</span>
                <span>👤 {shortHex(job.submitter)}</span>
                <span>⏰ {untilClock(job.timestamp)}</span>
              </div>
              <div style={styles.jobPreview}>
                <span style={styles.label}>Source:</span>
                <span style={styles.text}>{job.source_text.slice(0, 80)}...</span>
              </div>
              <div style={styles.jobPreview}>
                <span style={styles.label}>Translation:</span>
                <span style={styles.text}>{job.translation.slice(0, 80)}...</span>
              </div>
              {job.status === "JUDGED" && (
                <div style={styles.score}>
                  Score: <strong>{job.score}/100</strong>
                </div>
              )}
              {job.status === "PAID" && (
                <div style={styles.paid}>✓ Reward claimed</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const statusStyles: Record<string, React.CSSProperties> = {
  PENDING: { background: "#fff3e0", color: "#e65100" },
  JUDGED: { background: "#e3f2fd", color: "#1565c0" },
  PAID: { background: "#e8f5e9", color: "#2e7d32" },
};

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  card: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "32px", maxWidth: "480px", width: "100%", textAlign: "center" },
  title: { margin: "0 0 8px", fontSize: "1.75rem", fontWeight: 600 },
  badge: { display: "inline-block", background: "#e3f2fd", color: "#1565c0", padding: "4px 12px", borderRadius: "12px", fontSize: "0.85rem", marginBottom: "16px" },
  subtitle: { margin: "0 0 4px", fontSize: "1.1rem", color: "#333" },
  desc: { margin: "16px 0 24px", color: "#666", lineHeight: 1.5 },
  connectBtn: { padding: "12px 24px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" },
  container: { maxWidth: "900px", margin: "0 auto", padding: "24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  wallet: { color: "#666", fontSize: "0.9rem" },
  refreshBtn: { padding: "8px 16px", background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: "8px", cursor: "pointer" },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" },
  stat: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "16px", textAlign: "center" },
  statValue: { display: "block", fontSize: "2rem", fontWeight: 700, color: "#1976d2" },
  statLabel: { fontSize: "0.85rem", color: "#666" },
  actions: { marginBottom: "24px" },
  submitBtn: { display: "inline-block", padding: "12px 24px", background: "#1976d2", color: "#fff", borderRadius: "8px", textDecoration: "none", fontWeight: 500, transition: "background 0.2s" },
  empty: { textAlign: "center", padding: "48px", color: "#666" },
  link: { color: "#1976d2", textDecoration: "none", fontWeight: 500 },
  list: { display: "grid", gap: "16px" },
  jobCard: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", textDecoration: "none", color: "inherit", transition: "box-shadow 0.2s, border-color 0.2s" },
  jobHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  jobId: { fontSize: "0.9rem", fontWeight: 600, color: "#333" },
  status: { padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" },
  jobMeta: { display: "flex", gap: "16px", fontSize: "0.8rem", color: "#666", marginBottom: "12px" },
  jobPreview: { display: "flex", gap: "8px", marginBottom: "8px" },
  label: { fontSize: "0.8rem", color: "#999", minWidth: "70px" },
  text: { fontSize: "0.9rem", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  score: { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f0f0", fontSize: "0.95rem", color: "#1565c0" },
  paid: { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f0f0", fontSize: "0.9rem", color: "#2e7d32" },
};