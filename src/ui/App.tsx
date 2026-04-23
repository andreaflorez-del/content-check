import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { LayerList } from './components/LayerList';
import { AnalysisResult } from './components/AnalysisResult';
import { HomeMenu, FeatureId } from './components/HomeMenu';
import { AlternativasView } from './views/AlternativasView';
import { StorytellingView } from './views/StorytellingView';
import { EntendimientoView } from './views/EntendimientoView';
import { useAnalysis, TextLayer, DEMO_API_KEY } from './hooks/useAnalysis';

const API_KEY_STORAGE = 'meli_ux_advisor_api_key';

// localStorage can throw SecurityError in sandboxed iframes
function storageGet(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function storageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* silent */ }
}
function storageRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* silent */ }
}

type Screen = 'home' | FeatureId;

const FEATURE_TITLES: Record<FeatureId, string> = {
  analizar:      'Analizar contenido',
  alternativas:  'Generar alternativas',
  storytelling:  'Analizar storytelling',
  entendimiento: 'Evaluar entendimiento',
};

export function App() {
  const [apiKey, setApiKey] = useState<string>(() => storageGet(API_KEY_STORAGE));
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');

  const { state, results, error, analyze, reset } = useAnalysis();

  // Keep a ref so the message-handler closure always reads the current state
  // without needing to be re-registered every time state changes.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Listen to messages from code.ts
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === 'LAYERS') {
        setLayers(msg.layers ?? []);
        // Only reset analysis when the user intentionally changes the selection,
        // not when a programmatic highlight triggers a spurious selectionchange.
        if (stateRef.current !== 'done' && stateRef.current !== 'analyzing') {
          reset();
        }
      }

      if (msg.type === 'APPLY_SUCCESS') {
        setApplyingId(null);
      }

      if (msg.type === 'APPLY_ERROR') {
        setApplyingId(null);
        console.error('Apply error:', msg.error);
      }
    }

    window.addEventListener('message', onMessage);

    // Tell code.ts the UI is ready — triggers the first LAYERS message
    parent.postMessage({ pluginMessage: { type: 'READY' } }, '*');

    return () => window.removeEventListener('message', onMessage);
  }, [reset]);

  function saveApiKey(key: string) {
    storageSet(API_KEY_STORAGE, key);
    setApiKey(key);
  }

  function clearApiKey() {
    storageRemove(API_KEY_STORAGE);
    setApiKey('');
  }

  const handleAnalyze = useCallback(() => {
    if (layers.length > 0 && apiKey) {
      analyze(layers, apiKey);
    }
  }, [layers, apiKey, analyze]);

  function handleApply(layerId: string, found: string, recommended: string) {
    setApplyingId(layerId);
    parent.postMessage({ pluginMessage: { type: 'APPLY', layerId, found, newText: recommended } }, '*');
  }

  function handleHighlight(layerId: string) {
    parent.postMessage({ pluginMessage: { type: 'HIGHLIGHT_LAYER', layerId } }, '*');
  }

  function handleSelectFeature(feature: FeatureId) {
    reset();
    setScreen(feature);
  }

  function handleBack() {
    reset();
    setScreen('home');
  }

  // --- Render ---

  if (!apiKey) {
    return (
      <div style={styles.root}>
        <Header />
        <ApiKeyInput onSave={saveApiKey} />
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <Header
        onClearKey={clearApiKey}
        apiKey={apiKey}
        onBack={screen !== 'home' ? handleBack : undefined}
        screenTitle={screen !== 'home' ? FEATURE_TITLES[screen] : undefined}
      />

      <div style={styles.content}>
        {screen === 'home' && (
          <HomeMenu onSelect={handleSelectFeature} layerCount={layers.length} />
        )}

        {screen === 'analizar' && (
          <>
            {(state === 'idle' || state === 'analyzing') && (
              <LayerList
                layers={layers}
                onAnalyze={handleAnalyze}
                analyzing={state === 'analyzing'}
              />
            )}

            {state === 'error' && (
              <div style={styles.errorBox}>
                <p style={styles.errorTitle}>No se pudo completar el análisis</p>
                <p style={styles.errorMsg}>{error}</p>
                <button onClick={reset} style={styles.retryBtn}>
                  Intentar de nuevo
                </button>
              </div>
            )}

            {state === 'done' && (
              <AnalysisResult
                results={results}
                onApply={handleApply}
                onHighlight={handleHighlight}
                applyingId={applyingId}
              />
            )}
          </>
        )}

        {screen === 'alternativas' && (
          <AlternativasView key={layers.map(l => l.id).join(',')} layers={layers} apiKey={apiKey} onApply={handleApply} />
        )}

        {screen === 'storytelling' && (
          <StorytellingView key={layers.map(l => l.id).join(',')} layers={layers} apiKey={apiKey} />
        )}

        {screen === 'entendimiento' && (
          <EntendimientoView key={layers.map(l => l.id).join(',')} layers={layers} apiKey={apiKey} />
        )}
      </div>
    </div>
  );
}

function Header({
  onClearKey,
  apiKey,
  onBack,
  screenTitle,
}: {
  onClearKey?: () => void;
  apiKey?: string;
  onBack?: () => void;
  screenTitle?: string;
}) {
  const isDemo = apiKey === DEMO_API_KEY;
  return (
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        {onBack ? (
          <button onClick={onBack} style={styles.backBtn} title="Volver al menú">
            ←
          </button>
        ) : (
          <span style={styles.logo}>✍️</span>
        )}
        <div>
          <div style={styles.headerTitle}>
            {screenTitle ?? 'Content check'}
          </div>
          {!screenTitle && (
            <div style={styles.headerSubtitle}>MELI Manual de Estilo</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isDemo && <span style={styles.demoBadge}>Demo</span>}
        {onClearKey && apiKey && (
          <button
            onClick={onClearKey}
            style={styles.keyBtn}
            title={isDemo ? 'Salir del modo demo' : 'Cambiar API key'}
          >
            {isDemo ? '✕' : '🔑'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    color: '#1a1a1a',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    fontSize: '24px',
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1a1a1a',
    lineHeight: '1.2',
  },
  headerSubtitle: {
    fontSize: '11px',
    color: '#00a650',
    fontWeight: 600,
  },
  backBtn: {
    background: 'none',
    border: '1px solid #eee',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#555',
    lineHeight: 1,
  },
  keyBtn: {
    background: 'none',
    border: '1px solid #eee',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  demoBadge: {
    fontSize: '11px',
    fontWeight: 700,
    background: '#fff3cd',
    color: '#856404',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid #ffc107',
  },
  content: {
    padding: '16px',
    flex: 1,
    overflowY: 'auto',
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
};
