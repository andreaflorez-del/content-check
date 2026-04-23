import React, { useState } from 'react';
import { TextLayer } from '../hooks/useAnalysis';
import { useAlternativas, TextVariant, LayerVariants } from '../hooks/useAlternativas';

interface Props {
  layers: TextLayer[];
  apiKey: string;
  onApply: (layerId: string, found: string, recommended: string) => void;
}

const IMPROVEMENT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'más directo':              { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
  'más claro':                { bg: '#e0f2f1', color: '#00695c', border: '#80cbc4' },
  'más empático':             { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
  'más orientado a acción':   { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  'más orientado a beneficio':{ bg: '#e8f5e9', color: '#1b5e20', border: '#a5d6a7' },
  'más escaneable':           { bg: '#fce4ec', color: '#880e4f', border: '#f48fb1' },
};

const DEFAULT_COLOR = { bg: '#f5f5f5', color: '#555', border: '#ddd' };

const MSG_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CTA:            { bg: '#1a1a1a', color: '#fff' },
  Error:          { bg: '#ffebee', color: '#c62828' },
  'Éxito':        { bg: '#e8f5e9', color: '#1b5e20' },
  'Estado vacío': { bg: '#f3e5f5', color: '#6a1b9a' },
  Informativo:    { bg: '#e3f2fd', color: '#1565c0' },
  Ayuda:          { bg: '#fff8e1', color: '#e65100' },
};

function VariantCard({
  variant,
  layerId,
  original,
  onApply,
}: {
  variant: TextVariant;
  layerId: string;
  original: string;
  onApply: (layerId: string, found: string, recommended: string) => void;
}) {
  const [applied, setApplied] = useState(false);
  const cfg = IMPROVEMENT_COLORS[variant.improvementType] ?? DEFAULT_COLOR;

  function handleApply() {
    onApply(layerId, original, variant.text);
    setApplied(true);
  }

  function handleRestore() {
    onApply(layerId, variant.text, original);
    setApplied(false);
  }

  return (
    <div
      style={{
        ...styles.altCard,
        background: applied ? '#f0fdf4' : '#fafafa',
        borderColor: applied ? '#86efac' : cfg.border,
      }}
    >
      <div style={styles.altCardHeader}>
        <span
          style={{
            ...styles.typeBadge,
            background: cfg.bg,
            color: cfg.color,
            borderColor: cfg.border,
          }}
        >
          {variant.improvementType}
        </span>
        {applied && <span style={styles.appliedBadge}>✓ Aplicado</span>}
      </div>
      <p style={{
        ...styles.altText,
        textDecoration: applied ? 'line-through' : 'none',
        opacity: applied ? 0.6 : 1,
      }}>
        "{variant.text}"
      </p>
      <p style={styles.rationale}>{variant.rationale}</p>
      <div style={styles.altCardActions}>
        {!applied ? (
          <button onClick={handleApply} style={styles.applyBtn}>
            Aplicar
          </button>
        ) : (
          <button onClick={handleRestore} style={styles.restoreBtn}>
            ↩ Restaurar
          </button>
        )}
      </div>
    </div>
  );
}

function LayerResult({
  layerResult,
  onApply,
}: {
  layerResult: LayerVariants;
  onApply: (layerId: string, found: string, recommended: string) => void;
}) {
  const msgCfg = MSG_TYPE_COLORS[layerResult.messageType] ?? { bg: '#f5f5f5', color: '#555' };

  return (
    <div style={styles.layerSection}>
      <div style={styles.layerHeader}>
        <span style={styles.layerIcon}>T</span>
        <span style={styles.layerName}>{layerResult.name}</span>
        <span style={{ ...styles.msgTypeBadge, background: msgCfg.bg, color: msgCfg.color }}>
          {layerResult.messageType}
        </span>
      </div>

      <div style={styles.intentBox}>
        <span style={styles.intentLabel}>INTENCIÓN DETECTADA</span>
        <span style={styles.intentText}>{layerResult.detectedIntent}</span>
      </div>

      <div style={styles.originalBox}>
        <span style={styles.originalLabel}>ORIGINAL</span>
        <span style={styles.originalText}>"{layerResult.original}"</span>
      </div>

      {layerResult.variants.length === 0 ? (
        <p style={styles.noVariants}>
          El texto ya es claro y directo. No se generaron variantes adicionales.
        </p>
      ) : (
        <div style={styles.altList}>
          {layerResult.variants.map((v) => (
            <VariantCard
              key={v.improvementType}
              variant={v}
              layerId={layerResult.id}
              original={layerResult.original}
              onApply={onApply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AlternativasView({ layers, apiKey, onApply }: Props) {
  const { state, results, error, generate, reset } = useAlternativas();

  if (layers.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>✍️</div>
        <p style={styles.emptyText}>
          Selecciona un layer de texto en el canvas para generar alternativas
        </p>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <div style={styles.container}>
        <div style={styles.previewSection}>
          <p style={styles.sectionLabel}>LAYERS SELECCIONADOS</p>
          {layers.slice(0, 5).map((l) => (
            <div key={l.id} style={styles.layerPreview}>
              <span style={styles.layerIcon}>T</span>
              <div style={styles.layerPreviewInfo}>
                <div style={styles.layerPreviewName}>{l.name}</div>
                <div style={styles.layerPreviewText}>
                  {l.characters.length > 60 ? l.characters.slice(0, 60) + '…' : l.characters}
                </div>
              </div>
            </div>
          ))}
          {layers.length > 5 && (
            <p style={styles.moreText}>+{layers.length - 5} layers más</p>
          )}
        </div>
        <p style={styles.hintText}>
          Se generarán variantes por dimensión de mejora: más directo, más claro, más empático, más orientado a beneficio y más escaneable. Solo se incluyen las variantes que aporten valor real.
        </p>
        <button onClick={() => generate(layers, apiKey)} style={styles.generateBtn}>
          Generar alternativas con Claude
        </button>
      </div>
    );
  }

  if (state === 'generating') {
    return (
      <div style={styles.loadingState}>
        <span style={styles.spinner} />
        <p style={styles.loadingText}>Generando alternativas…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={styles.errorBox}>
        <p style={styles.errorTitle}>No se pudieron generar las alternativas</p>
        <p style={styles.errorMsg}>{error}</p>
        <button onClick={reset} style={styles.retryBtn}>Intentar de nuevo</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {results.map((layerResult) => (
        <LayerResult key={layerResult.id} layerResult={layerResult} onApply={onApply} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionLabel: {
    margin: '0 0 4px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#999',
    letterSpacing: '0.5px',
  },
  layerPreview: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 10px',
    background: '#f7f7f7',
    borderRadius: '6px',
    border: '1px solid #eee',
  },
  layerIcon: {
    width: '18px',
    height: '18px',
    background: '#1a1a1a',
    color: '#fff',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  layerPreviewInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    overflow: 'hidden',
  },
  layerPreviewName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  layerPreviewText: {
    fontSize: '11px',
    color: '#777',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  moreText: {
    margin: 0,
    fontSize: '11px',
    color: '#aaa',
    textAlign: 'center',
  },
  hintText: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
    lineHeight: '1.5',
  },
  generateBtn: {
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
  layerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  layerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  layerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
    flex: 1,
  },
  msgTypeBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  intentBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '7px 10px',
    background: '#f0f7ff',
    borderRadius: '6px',
    border: '1px solid #dbeafe',
  },
  intentLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#93c5fd',
    letterSpacing: '0.4px',
  },
  intentText: {
    fontSize: '12px',
    color: '#1e40af',
    lineHeight: '1.4',
  },
  originalBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '8px 10px',
    background: '#f7f7f7',
    borderRadius: '6px',
    border: '1px solid #eee',
  },
  originalLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#aaa',
    letterSpacing: '0.4px',
  },
  originalText: {
    fontSize: '13px',
    color: '#444',
    fontStyle: 'italic',
  },
  noVariants: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  altList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  altCard: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  altCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  typeBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid',
    letterSpacing: '0.2px',
  },
  appliedBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#16a34a',
    marginLeft: 'auto',
  },
  altText: {
    margin: 0,
    fontSize: '13px',
    color: '#1a1a1a',
    fontWeight: 500,
    lineHeight: '1.4',
  },
  rationale: {
    margin: 0,
    fontSize: '11px',
    color: '#777',
    lineHeight: '1.4',
  },
  altCardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '2px',
  },
  applyBtn: {
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: 700,
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  restoreBtn: {
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};
