import React from 'react';
import { TextLayer } from '../hooks/useAnalysis';

interface Props {
  layers: TextLayer[];
  onAnalyze: () => void;
  analyzing: boolean;
}

export function LayerList({ layers, onAnalyze, analyzing }: Props) {
  if (layers.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>↖️</div>
        <p style={styles.emptyText}>
          Selecciona un frame o texto en el canvas para comenzar
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.count}>
          {layers.length} {layers.length === 1 ? 'layer' : 'layers'} seleccionados
        </span>
      </div>

      <ul style={styles.list}>
        {layers.map((layer) => (
          <li key={layer.id} style={styles.item}>
            <div style={styles.itemHeader}>
              <span style={styles.layerIcon}>T</span>
              <span style={styles.layerName}>{layer.name}</span>
              <span style={styles.charCount}>{layer.characters.length} car.</span>
            </div>
            <p style={styles.preview}>
              {layer.characters.length > 80
                ? layer.characters.slice(0, 80) + '…'
                : layer.characters}
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={onAnalyze}
        disabled={analyzing}
        style={{
          ...styles.analyzeBtn,
          opacity: analyzing ? 0.7 : 1,
          cursor: analyzing ? 'not-allowed' : 'pointer',
        }}
      >
        {analyzing ? (
          <span style={styles.loadingRow}>
            <span style={styles.spinner} />
            Analizando…
          </span>
        ) : (
          'Analizar con Claude'
        )}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  item: {
    padding: '10px 12px',
    background: '#f7f7f7',
    borderRadius: '8px',
    border: '1px solid #eee',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
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
  layerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  charCount: {
    fontSize: '11px',
    color: '#999',
    flexShrink: 0,
  },
  preview: {
    margin: 0,
    fontSize: '12px',
    color: '#555',
    lineHeight: '1.4',
    wordBreak: 'break-word',
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
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 24px',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '32px',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    lineHeight: '1.5',
  },
};
