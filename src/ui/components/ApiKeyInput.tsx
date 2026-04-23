import React, { useState } from 'react';
import { DEMO_API_KEY } from '../hooks/useAnalysis';

interface Props {
  onSave: (key: string) => void;
}

export function ApiKeyInput({ onSave }: Props) {
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.icon}>🔑</div>
      <h2 style={styles.title}>Configurar API Key</h2>
      <p style={styles.description}>
        Ingresa tu Anthropic API Key para analizar textos con Claude.
        Se guarda localmente en tu navegador.
      </p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputRow}>
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={styles.input}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            style={styles.toggleBtn}
            title={visible ? 'Ocultar' : 'Mostrar'}
          >
            {visible ? '🙈' : '👁️'}
          </button>
        </div>
        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            ...styles.saveBtn,
            opacity: value.trim() ? 1 : 0.5,
            cursor: value.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Guardar
        </button>
      </form>
      <p style={styles.hint}>
        Obtén tu API key en{' '}
        <span style={styles.link}>console.anthropic.com</span>
      </p>

      <div style={styles.divider}>
        <span style={styles.dividerText}>o</span>
      </div>

      <button onClick={() => onSave(DEMO_API_KEY)} style={styles.demoBtn}>
        Probar modo demo
      </button>
      <p style={styles.demoHint}>
        Analiza con datos de ejemplo sin necesitar una key
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
    gap: '12px',
  },
  icon: {
    fontSize: '40px',
    marginBottom: '4px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  description: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  toggleBtn: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#00a650',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
  },
  hint: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
  },
  link: {
    color: '#00a650',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: '8px',
    color: '#ccc',
    fontSize: '12px',
  },
  dividerText: {
    padding: '0 8px',
    color: '#bbb',
    fontSize: '12px',
  },
  demoBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#f5f5f5',
    color: '#444',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  demoHint: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
    textAlign: 'center' as const,
  },
};
