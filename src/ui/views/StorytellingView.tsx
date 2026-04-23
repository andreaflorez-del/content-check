import React from 'react';
import { TextLayer } from '../hooks/useAnalysis';
import { useStorytelling } from '../hooks/useStorytelling';

interface Props {
  layers: TextLayer[];
  apiKey: string;
}

const SCORE_CONFIG = {
  good: { label: 'Buena coherencia narrativa', bg: '#e8f5e9', color: '#1b5e20', dot: '#43a047', border: '#c8e6c9' },
  fair: { label: 'Coherencia parcial',          bg: '#fffde7', color: '#f57f17', dot: '#fbc02d', border: '#fff176' },
  poor: { label: 'Requiere revisión profunda',  bg: '#fff0f0', color: '#c62828', dot: '#e53935', border: '#ffcdd2' },
};

const SEVERITY_DOT: Record<string, string> = {
  error:   '#e53935',
  warning: '#fbc02d',
  info:    '#43a047',
};

const SEVERITY_COLOR: Record<string, string> = {
  error:   '#c62828',
  warning: '#f57f17',
  info:    '#1b5e20',
};

export function StorytellingView({ layers, apiKey }: Props) {
  const { state, result, error, analyze, reset } = useStorytelling();

  if (layers.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🗺️</div>
        <p style={styles.emptyText}>
          Selecciona una board o frame con un flujo completo en el canvas
        </p>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <div style={styles.container}>
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Se analizarán <strong>{layers.length}</strong>{' '}
            {layers.length === 1 ? 'layer de texto' : 'layers de texto'} para evaluar la
            coherencia narrativa del flujo.
          </p>
        </div>
        <button onClick={() => analyze(layers, apiKey)} style={styles.analyzeBtn}>
          Analizar storytelling con Claude
        </button>
      </div>
    );
  }

  if (state === 'analyzing') {
    return (
      <div style={styles.loadingState}>
        <span style={styles.spinner} />
        <p style={styles.loadingText}>Evaluando coherencia narrativa…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={styles.errorBox}>
        <p style={styles.errorTitle}>No se pudo analizar el flujo</p>
        <p style={styles.errorMsg}>{error}</p>
        <button onClick={reset} style={styles.retryBtn}>Intentar de nuevo</button>
      </div>
    );
  }

  if (!result) return null;

  const scoreCfg = SCORE_CONFIG[result.overallScore] ?? SCORE_CONFIG.fair;

  return (
    <div style={styles.container}>
      {/* Score card */}
      <div style={{ ...styles.scoreCard, background: scoreCfg.bg, borderColor: scoreCfg.border }}>
        <div style={styles.scoreHeader}>
          <span style={{ ...styles.scoreDot, background: scoreCfg.dot }} />
          <span style={{ ...styles.scoreLabel, color: scoreCfg.color }}>{scoreCfg.label}</span>
        </div>
        <p style={styles.scoreSummary}>{result.summary}</p>
      </div>

      {/* Issues */}
      {result.issues.length > 0 && (
        <div style={styles.issuesSection}>
          <p style={styles.sectionLabel}>
            HALLAZGOS ({result.issues.length})
          </p>
          {result.issues.map((issue, idx) => (
            <div key={idx} style={styles.issueCard}>
              <div style={styles.issueHeader}>
                <span style={{ ...styles.issueDot, background: SEVERITY_DOT[issue.severity] ?? SEVERITY_DOT.info }} />
                <span style={{ ...styles.issueDimension, color: SEVERITY_COLOR[issue.severity] ?? SEVERITY_COLOR.info }}>
                  {issue.dimension}
                </span>
              </div>
              <p style={styles.issueFinding}>{issue.finding}</p>
              <div style={styles.recommendationBox}>
                <span style={styles.recommendationLabel}>RECOMENDACIÓN</span>
                <p style={styles.recommendationText}>{issue.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.issues.length === 0 && (
        <div style={styles.noIssues}>
          El flujo tiene una coherencia narrativa excelente ✓
        </div>
      )}

      <button onClick={reset} style={styles.resetBtn}>
        Analizar de nuevo
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 24px',
    gap: '12px',
  },
  emptyIcon: { fontSize: '32px' },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  infoBox: {
    padding: '12px 14px',
    background: '#f7f7f7',
    borderRadius: '8px',
    border: '1px solid #eee',
  },
  infoText: {
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5',
  },
  analyzeBtn: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#00a650',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    width: '100%',
    cursor: 'pointer',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    gap: '16px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e0e0e0',
    borderTopColor: '#00a650',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  loadingText: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
  },
  errorBox: {
    padding: '20px',
    background: '#fff0f0',
    borderRadius: '8px',
    border: '1px solid #ffcdd2',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  errorTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#c62828',
  },
  errorMsg: {
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5',
  },
  retryBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    background: '#e53935',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  scoreCard: {
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  scoreHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  scoreDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  scoreLabel: {
    fontSize: '13px',
    fontWeight: 700,
  },
  scoreSummary: {
    margin: 0,
    fontSize: '13px',
    color: '#333',
    lineHeight: '1.5',
  },
  issuesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    margin: '0 0 4px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#999',
    letterSpacing: '0.5px',
  },
  issueCard: {
    padding: '12px',
    background: '#fafafa',
    borderRadius: '8px',
    border: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  issueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  issueDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  issueDimension: {
    fontSize: '12px',
    fontWeight: 700,
  },
  issueFinding: {
    margin: 0,
    fontSize: '12px',
    color: '#333',
    lineHeight: '1.5',
  },
  recommendationBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingTop: '6px',
    borderTop: '1px solid #eee',
  },
  recommendationLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#aaa',
    letterSpacing: '0.4px',
  },
  recommendationText: {
    margin: 0,
    fontSize: '12px',
    color: '#1a6e35',
    lineHeight: '1.5',
    fontWeight: 500,
  },
  noIssues: {
    padding: '12px 14px',
    fontSize: '13px',
    color: '#388e3c',
    background: '#e8f5e9',
    borderRadius: '8px',
    border: '1px solid #c8e6c9',
  },
  resetBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    background: 'none',
    color: '#555',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};
