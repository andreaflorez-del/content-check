import React, { useState } from 'react';
import { TextLayer } from '../hooks/useAnalysis';
import { useEntendimiento, AnalysisContext } from '../hooks/useEntendimiento';

interface Props {
  layers: TextLayer[];
  apiKey: string;
}

const CONTENT_TYPES = [
  'Centro de aprendizaje / Guía educativa',
  'Pantalla de flujo (onboarding, registro, compra)',
  'Pantalla de error o estado vacío',
  'Modal o tooltip',
  'Email o push notification',
  'Landing o home',
  'Otro',
];

const CLARITY_CONFIG = {
  clear:     { label: 'Claro para el usuario',  bg: '#e8f5e9', color: '#1b5e20', dot: '#43a047', border: '#c8e6c9' },
  moderate:  { label: 'Moderadamente claro',    bg: '#fffde7', color: '#f57f17', dot: '#fbc02d', border: '#fff176' },
  confusing: { label: 'Genera confusión',        bg: '#fff0f0', color: '#c62828', dot: '#e53935', border: '#ffcdd2' },
};

export function EntendimientoView({ layers, apiKey }: Props) {
  const { state, result, error, evaluate, reset } = useEntendimiento();

  const [context, setContext] = useState<AnalysisContext>({
    contentType: CONTENT_TYPES[0],
    objective: '',
    extraContext: '',
  });
  const [contextReady, setContextReady] = useState(false);

  // ── Empty selection ────────────────────────────────────────────────────────
  if (layers.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🧠</div>
        <p style={styles.emptyText}>
          Selecciona un componente o pantalla en el canvas para evaluar el entendimiento
        </p>
      </div>
    );
  }

  // ── Step 1: Context form ───────────────────────────────────────────────────
  if (!contextReady) {
    const canContinue = context.objective.trim().length > 0;
    return (
      <div style={styles.container}>
        <div style={styles.formIntro}>
          <p style={styles.formIntroText}>
            Antes de analizar, danos un poco de contexto. Esto ayuda al asistente a evaluar el entendimiento desde la perspectiva correcta.
          </p>
        </div>

        {/* Content type */}
        <div style={styles.field}>
          <label style={styles.label}>Tipo de pieza</label>
          <select
            style={styles.select}
            value={context.contentType}
            onChange={e => setContext(c => ({ ...c, contentType: e.target.value }))}
          >
            {CONTENT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Objective */}
        <div style={styles.field}>
          <label style={styles.label}>
            ¿Qué queremos que el usuario entienda o haga? <span style={styles.required}>*</span>
          </label>
          <textarea
            style={styles.textarea}
            rows={3}
            placeholder='Ej: Que entienda qué son los Productos de catálogo y cómo acceder a ellos para gestionar su marca'
            value={context.objective}
            onChange={e => setContext(c => ({ ...c, objective: e.target.value }))}
          />
        </div>

        {/* Extra context */}
        <div style={styles.field}>
          <label style={styles.label}>Contexto adicional <span style={styles.optional}>(opcional)</span></label>
          <textarea
            style={styles.textarea}
            rows={2}
            placeholder='Ej: Es parte de la sección de ayuda para vendedores con tienda oficial. El usuario ya tiene cuenta.'
            value={context.extraContext}
            onChange={e => setContext(c => ({ ...c, extraContext: e.target.value }))}
          />
        </div>

        <button
          onClick={() => setContextReady(true)}
          style={{ ...styles.continueBtn, opacity: canContinue ? 1 : 0.45, cursor: canContinue ? 'pointer' : 'default' }}
          disabled={!canContinue}
        >
          Continuar al análisis →
        </button>
      </div>
    );
  }

  // ── Step 2: Idle — show context badge + analyze button ────────────────────
  if (state === 'idle') {
    return (
      <div style={styles.container}>
        {/* Context badge */}
        <div style={styles.contextBadge}>
          <div style={styles.contextBadgeRow}>
            <span style={styles.contextBadgeType}>{context.contentType}</span>
            <button onClick={() => setContextReady(false)} style={styles.editContextBtn}>
              Editar
            </button>
          </div>
          <p style={styles.contextBadgeObjective}>"{context.objective}"</p>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Se analizarán <strong>{layers.length}</strong>{' '}
            {layers.length === 1 ? 'elemento de texto' : 'elementos de texto'}.
          </p>
        </div>

        <button onClick={() => evaluate(layers, apiKey, context)} style={styles.evaluateBtn}>
          Evaluar entendimiento con Claude
        </button>
      </div>
    );
  }

  // ── Evaluating ─────────────────────────────────────────────────────────────
  if (state === 'evaluating') {
    return (
      <div style={styles.loadingState}>
        <span style={styles.spinner} />
        <p style={styles.loadingText}>Simulando lectura de usuario…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div style={styles.errorBox}>
        <p style={styles.errorTitle}>No se pudo evaluar el entendimiento</p>
        <p style={styles.errorMsg}>{error}</p>
        <button onClick={reset} style={styles.retryBtn}>Intentar de nuevo</button>
      </div>
    );
  }

  if (!result) return null;

  const clarityCfg = CLARITY_CONFIG[result.overallClarity] ?? CLARITY_CONFIG.moderate;

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Context reminder */}
      <div style={styles.contextMini}>
        <span style={styles.contextMiniType}>{context.contentType}</span>
        <span style={styles.contextMiniSep}>·</span>
        <span style={styles.contextMiniObj}>"{context.objective.length > 60 ? context.objective.substring(0, 60) + '…' : context.objective}"</span>
      </div>

      {/* Clarity card */}
      <div style={{ ...styles.clarityCard, background: clarityCfg.bg, borderColor: clarityCfg.border }}>
        <div style={styles.clarityHeader}>
          <span style={{ ...styles.clarityDot, background: clarityCfg.dot }} />
          <span style={{ ...styles.clarityLabel, color: clarityCfg.color }}>{clarityCfg.label}</span>
        </div>
        <p style={styles.userSummary}>{result.userSummary}</p>
      </div>

      {/* First impression */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>PRIMERA IMPRESIÓN</p>
        <p style={styles.sectionText}>{result.firstImpression}</p>
      </div>

      {/* Key messages */}
      {result.keyMessages.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>MENSAJES CLAVE RECIBIDOS</p>
          <ul style={styles.messageList}>
            {result.keyMessages.map((msg, idx) => (
              <li key={idx} style={styles.messageItem}>
                <span style={styles.messageBullet}>→</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confusions */}
      {result.potentialConfusions.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>PUNTOS DE CONFUSIÓN ({result.potentialConfusions.length})</p>
          <div style={styles.confusionsList}>
            {result.potentialConfusions.map((confusion, idx) => (
              <div key={idx} style={styles.confusionCard}>
                <div style={styles.confusionElement}>{confusion.element}</div>
                <p style={styles.confusionIssue}>{confusion.issue}</p>
                <div style={styles.suggestionBox}>
                  <span style={styles.suggestionLabel}>SUGERENCIA</span>
                  <p style={styles.suggestionText}>{confusion.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA evaluation */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>EVALUACIÓN DEL CTA / PRÓXIMO PASO</p>
        <p style={styles.sectionText}>{result.callToAction}</p>
      </div>

      <button onClick={reset} style={styles.resetBtn}>
        Evaluar de nuevo
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

  // ── Context form ──────────────────────────────────────────────────────────
  formIntro: {
    padding: '12px 14px',
    background: '#f0f7ff',
    borderRadius: '8px',
    border: '1px solid #c5d8f5',
  },
  formIntroText: {
    margin: 0,
    fontSize: '13px',
    color: '#1a3a6e',
    lineHeight: '1.5',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#444',
  },
  required: {
    color: '#e53935',
  },
  optional: {
    color: '#999',
    fontWeight: 400,
  },
  select: {
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: '#fff',
    color: '#1a1a1a',
    width: '100%',
    fontFamily: 'inherit',
  },
  textarea: {
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: '#fff',
    color: '#1a1a1a',
    width: '100%',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    lineHeight: '1.5',
    boxSizing: 'border-box' as const,
  },
  continueBtn: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#00a650',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    width: '100%',
  },

  // ── Context badge (shown after form is filled) ────────────────────────────
  contextBadge: {
    padding: '10px 12px',
    background: '#f0f7ff',
    borderRadius: '8px',
    border: '1px solid #c5d8f5',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contextBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextBadgeType: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#1a3a6e',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  },
  editContextBtn: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: '#1565c0',
    cursor: 'pointer',
    padding: '0',
    fontWeight: 600,
  },
  contextBadgeObjective: {
    margin: 0,
    fontSize: '12px',
    color: '#333',
    lineHeight: '1.4',
    fontStyle: 'italic',
  },

  // ── Context mini (shown in results) ──────────────────────────────────────
  contextMini: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  contextMiniType: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#1565c0',
    background: '#e3f2fd',
    padding: '2px 7px',
    borderRadius: '10px',
    whiteSpace: 'nowrap' as const,
  },
  contextMiniSep: {
    fontSize: '11px',
    color: '#bbb',
  },
  contextMiniObj: {
    fontSize: '11px',
    color: '#666',
    fontStyle: 'italic',
    lineHeight: '1.4',
  },

  // ── Analysis UI ───────────────────────────────────────────────────────────
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
  evaluateBtn: {
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
  clarityCard: {
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  clarityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  clarityDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  clarityLabel: {
    fontSize: '13px',
    fontWeight: 700,
  },
  userSummary: {
    margin: 0,
    fontSize: '13px',
    color: '#333',
    lineHeight: '1.5',
    fontStyle: 'italic',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionLabel: {
    margin: 0,
    fontSize: '10px',
    fontWeight: 700,
    color: '#999',
    letterSpacing: '0.5px',
  },
  sectionText: {
    margin: 0,
    fontSize: '13px',
    color: '#333',
    lineHeight: '1.5',
  },
  messageList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  messageItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '13px',
    color: '#333',
    lineHeight: '1.5',
  },
  messageBullet: {
    color: '#00a650',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '1px',
  },
  confusionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  confusionCard: {
    padding: '12px',
    background: '#fafafa',
    borderRadius: '8px',
    border: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  confusionElement: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#c62828',
  },
  confusionIssue: {
    margin: 0,
    fontSize: '12px',
    color: '#333',
    lineHeight: '1.5',
  },
  suggestionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingTop: '6px',
    borderTop: '1px solid #eee',
  },
  suggestionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#aaa',
    letterSpacing: '0.4px',
  },
  suggestionText: {
    margin: 0,
    fontSize: '12px',
    color: '#1a6e35',
    lineHeight: '1.5',
    fontWeight: 500,
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
