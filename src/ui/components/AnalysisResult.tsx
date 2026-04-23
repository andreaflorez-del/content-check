import React, { useState } from 'react';
import { LayerAnalysis, Issue } from '../hooks/useAnalysis';

interface Props {
  results: LayerAnalysis[];
  onApply: (layerId: string, found: string, recommended: string) => void;
  onHighlight: (layerId: string) => void;
  applyingId: string | null;
}

const SEVERITY_CONFIG = {
  error:   { label: 'Error',       bg: '#fff0f0', border: '#ffcdd2', color: '#c62828', dot: '#e53935' },
  warning: { label: 'Advertencia', bg: '#fffde7', border: '#fff176', color: '#f57f17', dot: '#fbc02d' },
  info:    { label: 'Sugerencia',  bg: '#e8f5e9', border: '#c8e6c9', color: '#1b5e20', dot: '#43a047' },
};

function IssueCard({ issue, layerId, onApply, onHover, applying }: {
  issue: Issue;
  layerId: string;
  onApply: (layerId: string, found: string, recommended: string) => void;
  onHover: (layerId: string) => void;
  applying: boolean;
}) {
  const cfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.info;
  const [hovered, setHovered] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const hasRecommended = Boolean(issue.recommended && issue.recommended.trim());
  const isGuidance = hasRecommended && /^\[.*\]$/.test(issue.recommended.trim());

  function handleMouseEnter() {
    setHovered(true);
    onHover(layerId);
  }

  function handleMouseLeave() {
    setHovered(false);
  }

  function handleApply() {
    onApply(layerId, issue.found, issue.recommended);
    setIsApplied(true);
  }

  function handleRestore() {
    // Swap: search for the recommended text and put the original back
    onApply(layerId, issue.recommended, issue.found);
    setIsApplied(false);
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...styles.issueCard,
        background: isApplied ? '#f0fdf4' : cfg.bg,
        borderColor: isApplied ? '#86efac' : hovered ? cfg.dot : cfg.border,
        boxShadow: hovered && !isApplied ? `0 0 0 2px ${cfg.dot}33` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.2s',
      }}
    >
      {/* Header: severity + rule (or "Aplicado" badge) */}
      <div style={styles.issueHeader}>
        <span style={{ ...styles.dot, background: isApplied ? '#22c55e' : cfg.dot }} />
        <span style={{ ...styles.severityLabel, color: isApplied ? '#16a34a' : cfg.color }}>
          {isApplied ? 'Aplicado' : cfg.label}
        </span>
        <span style={styles.ruleName}>{issue.rule}</span>
      </div>

      {/* Row 1: Texto o palabra actual */}
      {issue.found && (
        <div style={styles.row}>
          <span style={styles.rowLabel}>Texto o palabra actual</span>
          <span style={{
            ...styles.foundText,
            textDecoration: isApplied ? 'line-through' : 'none',
            opacity: isApplied ? 0.5 : 1,
          }}>"{issue.found}"</span>
        </div>
      )}

      {/* Row 2: Oportunidad — detailed explanation */}
      {issue.explanation && !isApplied && (
        <div style={styles.row}>
          <span style={styles.rowLabel}>Oportunidad</span>
          <span style={styles.explanationText}>{issue.explanation}</span>
        </div>
      )}

      {/* Row 3: Recomendación + CTAs */}
      {hasRecommended && (
        <div style={styles.recommendedBlock}>
          <span style={styles.rowLabel}>Recomendación</span>
          <div style={styles.recommendedRow}>
            <span style={{
              ...styles.recommendedText,
              color: isApplied ? '#16a34a' : '#1a6e35',
              fontWeight: isApplied ? 700 : 600,
            }}>"{issue.recommended}"</span>

            {!isGuidance && (
              !isApplied ? (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  style={{
                    ...styles.applyBtn,
                    opacity: applying ? 0.6 : 1,
                    cursor: applying ? 'not-allowed' : 'pointer',
                  }}
                >
                  {applying ? 'Aplicando…' : 'Aplicar recomendación'}
                </button>
              ) : (
                <button
                  onClick={handleRestore}
                  disabled={applying}
                  style={{
                    ...styles.restoreBtn,
                    opacity: applying ? 0.6 : 1,
                    cursor: applying ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↩ Restaurar original
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalysisResult({ results, onApply, onHighlight, applyingId }: Props) {
  const totalIssues = results.reduce((acc, r) => acc + r.issues.length, 0);
  const errorCount = results.reduce(
    (acc, r) => acc + r.issues.filter((i) => i.severity === 'error').length,
    0
  );

  return (
    <div style={styles.container}>
      <div style={styles.summary}>
        <span style={styles.summaryTotal}>
          {totalIssues} {totalIssues === 1 ? 'oportunidad' : 'oportunidades'} encontradas
        </span>
        {errorCount > 0 && (
          <span style={styles.errorBadge}>
            {errorCount} {errorCount === 1 ? 'error' : 'errores'}
          </span>
        )}
      </div>

      {results.map((layer) => (
        <div key={layer.id} style={styles.layerSection}>
          <div style={styles.layerHeader}>
            <span style={styles.layerIcon}>T</span>
            <span style={styles.layerName}>{layer.name}</span>
            <span style={styles.layerIssueCount}>
              {layer.issues.length === 0
                ? '✓ Sin problemas'
                : `${layer.issues.length} ${layer.issues.length === 1 ? 'oportunidad' : 'oportunidades'}`}
            </span>
          </div>

          {layer.issues.length === 0 ? (
            <div style={styles.noIssues}>Este layer cumple con el manual de estilo</div>
          ) : (
            <div style={styles.issueList}>
              {layer.issues.map((issue, idx) => (
                <IssueCard
                  key={idx}
                  issue={issue}
                  layerId={layer.id}
                  onApply={onApply}
                  onHover={onHighlight}
                  applying={applyingId === layer.id}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: '#f0f0f0',
    borderRadius: '8px',
  },
  summaryTotal: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
    flex: 1,
  },
  errorBadge: {
    fontSize: '11px',
    fontWeight: 700,
    background: '#e53935',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  layerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  layerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  layerIcon: {
    width: '20px',
    height: '20px',
    background: '#1a1a1a',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  layerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
    flex: 1,
  },
  layerIssueCount: {
    fontSize: '12px',
    color: '#666',
  },
  issueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  issueCard: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: 'default',
  },
  issueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  severityLabel: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  ruleName: {
    fontSize: '11px',
    color: '#444',
    flex: 1,
  },
  row: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  rowLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  },
  foundText: {
    fontSize: '13px',
    color: '#c62828',
    fontStyle: 'italic' as const,
    fontWeight: 500,
  },
  explanationText: {
    fontSize: '12px',
    color: '#333',
    lineHeight: '1.5',
  },
  recommendedBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    paddingTop: '4px',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  recommendedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  recommendedText: {
    fontSize: '13px',
    color: '#1a6e35',
    fontWeight: 600,
    flex: 1,
    minWidth: '80px',
  },
  applyBtn: {
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 700,
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  restoreBtn: {
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '5px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  noIssues: {
    padding: '8px 12px',
    fontSize: '12px',
    color: '#388e3c',
    background: '#e8f5e9',
    borderRadius: '6px',
    border: '1px solid #c8e6c9',
  },
};
