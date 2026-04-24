import React, { useState } from 'react';

export type FeatureId = 'analizar' | 'alternativas' | 'storytelling' | 'entendimiento';

const FEATURES: Array<{
  id: FeatureId;
  icon: string;
  title: string;
  description: string;
  hint: string;
  wip?: boolean;
}> = [
  {
    id: 'analizar',
    icon: '🔍',
    title: 'Analizar contenido',
    description: 'Detecta oportunidades de mejora según el Manual de estilo MELI y las heurísticas de usabilidad',
    hint: 'Selecciona una pantalla o frame',
  },
  {
    id: 'alternativas',
    icon: '✍️',
    title: 'Generar alternativas de texto',
    description: 'Crea variantes con distintos tonos y jerarquías',
    hint: 'Selecciona un layer de texto',
    wip: true,
  },
  {
    id: 'storytelling',
    icon: '🗺️',
    title: 'Analizar storytelling',
    description: 'Evalúa la coherencia narrativa de un flujo completo',
    hint: 'Selecciona un board con un flujo',
    wip: true,
  },
  {
    id: 'entendimiento',
    icon: '🧠',
    title: 'Evaluar entendimiento',
    description: 'Simula cómo una persona usuaria lee tu pantalla',
    hint: 'Selecciona un componente o pantalla',
    wip: true,
  },
];

interface Props {
  onSelect: (feature: FeatureId) => void;
  layerCount: number;
}

export function HomeMenu({ onSelect, layerCount }: Props) {
  const [hovered, setHovered] = useState<FeatureId | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.list}>
        {FEATURES.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            onMouseEnter={() => setHovered(f.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...styles.card,
              background: hovered === f.id ? '#f5f5f5' : '#fff',
              borderColor: hovered === f.id ? '#ccc' : '#e8e8e8',
            }}
          >
            <span style={styles.cardIcon}>{f.icon}</span>
            <div style={styles.cardBody}>
              <div style={styles.cardTitleRow}>
                <div style={styles.cardTitle}>{f.title}</div>
                {f.wip && <span style={styles.wipPill}>Próximamente</span>}
              </div>
              <div style={styles.cardDesc}>{f.description}</div>
            </div>
            <span style={styles.arrow}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  selectionHint: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
    padding: '8px 12px',
    background: '#f7f7f7',
    borderRadius: '6px',
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 12px',
    border: '1px solid #e8e8e8',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s, border-color 0.1s',
    width: '100%',
    fontFamily: 'inherit',
  },
  cardIcon: {
    fontSize: '24px',
    flexShrink: 0,
    width: '32px',
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  wipPill: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#888',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '10px',
    padding: '1px 7px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  cardDesc: {
    fontSize: '12px',
    color: '#555',
    lineHeight: '1.4',
  },
  cardHint: {
    fontSize: '11px',
    color: '#aaa',
    marginTop: '2px',
  },
  arrow: {
    fontSize: '18px',
    color: '#ccc',
    flexShrink: 0,
  },
};
