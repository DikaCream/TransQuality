import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTransQuality } from "../context/TransQualityContext";
import { MIN_FEE, formatGen } from "../config";

export function SubmitPage() {
  const { submitTranslation, loading, addToast, isConnected, connect } = useTransQuality();
  const navigate = useNavigate();
  const [source, setSource] = useState("");
  const [translation, setTranslation] = useState("");
  const [targetLang, setTargetLang] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !translation.trim() || !targetLang.trim()) {
      addToast("All fields are required", "error");
      return;
    }
    try {
      await submitTranslation(source.trim(), translation.trim(), targetLang.trim());
      navigate("/");
    } catch {
      // error handled in context
    }
  };

  if (!isConnected) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h2 style={styles.title}>Connect Wallet</h2>
          <p style={styles.desc}>Please connect your wallet to submit a translation.</p>
          <button onClick={connect} style={styles.connectBtn}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← Back to Board</Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Submit Translation</h1>
        <p style={styles.desc}>
          Submit a translation for quality assessment by LLM consensus.
          Minimum fee: <strong>{formatGen(MIN_FEE)} GEN</strong>.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Source Text <span style={styles.required}>*</span></label>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter the original text..."
              style={styles.textarea}
              rows={6}
              required
              maxLength={5000}
            />
            <span style={styles.charCount}>{source.length}/5000</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Translation <span style={styles.required}>*</span></label>
            <textarea
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Enter the translation..."
              style={styles.textarea}
              rows={6}
              required
              maxLength={5000}
            />
            <span style={styles.charCount}>{translation.length}/5000</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Target Language <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              placeholder="e.g., Spanish, French, Japanese, Chinese..."
              style={styles.input}
              required
            />
          </div>

          <div style={styles.feeInfo}>
            Fee: <strong>{formatGen(MIN_FEE)} GEN</strong> (0.01 GEN)
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "Submitting..." : "Submit for Quality Check"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  card: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "32px", maxWidth: "600px", width: "100%", margin: "0 auto" },
  title: { margin: "0 0 8px", fontSize: "1.75rem", fontWeight: 600 },
  desc: { margin: "0 0 24px", color: "#666", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.9rem", fontWeight: 500, color: "#333" },
  required: { color: "#d32f2f" },
  textarea: { padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "1rem", fontFamily: "inherit", resize: "vertical", outline: "none" },
  input: { padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "1rem", outline: "none" },
  charCount: { fontSize: "0.75rem", color: "#999", textAlign: "right" },
  feeInfo: { padding: "12px", background: "#f5f5f5", borderRadius: "8px", fontSize: "0.9rem", color: "#666", textAlign: "center" },
  submitBtn: { padding: "14px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: 500, cursor: "pointer", marginTop: "8px" },
  backLink: { display: "inline-block", marginBottom: "24px", color: "#1976d2", textDecoration: "none", fontWeight: 500 },
};