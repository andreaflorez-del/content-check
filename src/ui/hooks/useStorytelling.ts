import { useState, useCallback } from 'react';
import { TextLayer, DEMO_API_KEY } from './useAnalysis';

export interface StorytellingIssue {
  dimension: string;
  finding: string;
  recommendation: string;
  severity: 'error' | 'warning' | 'info';
}

export interface StorytellingResult {
  overallScore: 'good' | 'fair' | 'poor';
  flowName: string;
  summary: string;
  issues: StorytellingIssue[];
}

export type StorytellingState = 'idle' | 'analyzing' | 'done' | 'error';

// ─── Local narrative analyzer (demo mode) ────────────────────────────────────
// Evaluates NARRATIVE STRUCTURE of the actual layer content:
// opening hook, FAQ fragmentation, information density, user addressing,
// CTA presence, and tonal consistency.
// Does NOT repeat grammar/vocabulary checks — those belong in "Analizar contenido".

function ex(text: string, max = 55): string {
  return text.length > max ? text.substring(0, max) + '…' : text;
}

function analyzeStorytellingLocally(layers: TextLayer[]): StorytellingResult {
  const issues: StorytellingIssue[] = [];
  const texts = layers.map(l => l.characters.trim()).filter(t => t.length > 0);

  if (texts.length === 0) {
    return {
      overallScore: 'good',
      flowName: 'Sin contenido de texto',
      summary: 'No se encontraron bloques de texto para analizar en la selección.',
      issues: [],
    };
  }

  const combined = texts.join('\n');

  // ── Structural classification ─────────────────────────────────────────────────
  // Titles: medium length, no trailing period
  const titleCandidates = texts.filter(t => t.length >= 12 && t.length <= 100 && !/\.$/.test(t));
  // Body: long blocks
  const bodyTexts = texts.filter(t => t.length > 100);
  // Short texts: potential CTA labels
  const shortTexts = texts.filter(t => t.length > 0 && t.length <= 35);
  // Questions: FAQ pattern
  const questions = texts.filter(t => t.startsWith('¿'));
  // Primary title: first title candidate
  const primaryTitle = titleCandidates[0] ?? texts[0] ?? '';

  // ── 1. Opening hook: user-benefit vs. system-description ─────────────────────
  if (primaryTitle && /^(¿Qué (es|son)|¿Cómo funciona|Información|Descripción|Acerca de|Introducción a)/i.test(primaryTitle)) {
    issues.push({
      dimension: 'Apertura narrativa',
      finding: `"${ex(primaryTitle)}" — el título de apertura describe el sistema en lugar de conectar con la motivación del usuario.`,
      recommendation: 'Storytelling: el hook de apertura debe comunicar el beneficio principal desde la primera línea. En lugar de "¿Qué es X?", usar "Con X puedes [beneficio concreto para el usuario]".',
      severity: 'warning',
    });
  }

  // ── 2. FAQ fragmentation ──────────────────────────────────────────────────────
  if (questions.length >= 2) {
    issues.push({
      dimension: 'Continuidad narrativa',
      finding: `Se detectaron ${questions.length} secciones de pregunta (ej: "${ex(questions[0], 50)}"). Las FAQs interrumpen el flujo narrativo y obligan al usuario a buscar lo que le es relevante.`,
      recommendation: 'Storytelling: reorganizar el contenido como flujo lineal de beneficios. Las preguntas frecuentes funcionan mejor en una sección de ayuda separada, fuera del flujo de conversión principal.',
      severity: questions.length >= 3 ? 'warning' : 'info',
    });
  }

  // ── 3. Information density / cognitive load ───────────────────────────────────
  if (texts.length > 10) {
    issues.push({
      dimension: 'Compromiso emocional — Conductual',
      finding: `La pantalla contiene ${texts.length} bloques de texto. La alta densidad puede generar fatiga cognitiva antes de que el usuario llegue al momento de acción principal.`,
      recommendation: 'Storytelling (NNG): aplicar pirámide invertida. Los 3 beneficios más importantes al inicio; el resto, detrás de un "ver más" o en pantallas de ayuda complementarias.',
      severity: 'warning',
    });
  }

  // ── 4. Direct user addressing (second person) ─────────────────────────────────
  const addressesUser = /\btu\b|\btú\b|\bpuedes\b|\btienes\b|\btuyo\b/i.test(combined);
  if (!addressesUser && bodyTexts.length > 0) {
    issues.push({
      dimension: 'Compromiso emocional — Visceral',
      finding: `"${ex(bodyTexts[0], 60)}" — el texto habla sobre el producto sin dirigirse directamente al usuario.`,
      recommendation: 'Storytelling: usar "tú" y verbos en segunda persona crea conexión emocional directa. En lugar de "La sección permite...", usar "Desde aquí puedes...".',
      severity: 'warning',
    });
  }

  // ── 5. Missing climax (CTA) ───────────────────────────────────────────────────
  // CTAs: short texts starting with an infinitive or known action verb
  const ctaCandidates = shortTexts.filter(t =>
    /^[A-ZÁÉÍÓÚ][a-záéíóúü]+(ar|er|ir)\b/.test(t) ||
    /^(Comenzar|Empezar|Acceder|Registrar|Crear|Explorar|Ver|Ir a|Descubrir|Solicitar|Ir)\b/i.test(t)
  );
  if (ctaCandidates.length === 0 && shortTexts.length < 2) {
    issues.push({
      dimension: 'Estructura narrativa — Clímax',
      finding: 'No se detectó un CTA claro que represente el "momento aha" del flujo.',
      recommendation: 'Storytelling: toda pantalla necesita un clímax — una acción principal que resuelva la necesidad que motivó al usuario. El CTA debe reflejar el beneficio principal anunciado en el título.',
      severity: 'warning',
    });
  }

  // ── 6. Tonal inconsistency (only when both tuteo AND usted are present) ────────
  const hasTuteo = /\btu\b|\btú\b|\bpuedes\b/i.test(combined);
  const hasUsted = /\busted\b/i.test(combined);
  if (hasTuteo && hasUsted) {
    issues.push({
      dimension: 'Consistencia de tono',
      finding: 'El contenido mezcla tuteo ("tú") con formalidad ("usted"), creando inconsistencia emocional en el flujo.',
      recommendation: 'MELI tutea siempre. Reemplazar todos los "usted" por "tú" para mantener la coherencia emocional del principio al final.',
      severity: 'error',
    });
  }

  // ── Score & summary ───────────────────────────────────────────────────────────
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  const overallScore: 'good' | 'fair' | 'poor' =
    errors === 0 && warnings === 0 ? 'good' :
    errors === 0 && warnings <= 2  ? 'fair' :
                                     'poor';

  const flowName = primaryTitle.length > 0 ? ex(primaryTitle, 45) : `Pantalla (${texts.length} bloques)`;

  let summary: string;
  if (issues.length === 0) {
    summary = 'El contenido tiene una coherencia narrativa sólida. La apertura conecta con el usuario, la jerarquía informativa es clara y hay un CTA bien definido.';
  } else if (overallScore === 'fair') {
    const dims = issues.filter(i => i.severity !== 'info').map(i => i.dimension).slice(0, 2).join(' y ');
    summary = `El contenido tiene una estructura básica con oportunidades de mejora en ${dims}. Algunos elementos pueden dificultar que el usuario llegue al momento clave del flujo.`;
  } else {
    summary = `El flujo presenta ${issues.length} oportunidad${issues.length === 1 ? '' : 'es'} de mejora narrativa que pueden afectar el engagement emocional del usuario antes del CTA principal.`;
  }

  return { overallScore, flowName, summary, issues };
}

const STORYTELLING_PROMPT = `Eres un asesor senior de UX Writing de Mercado Libre y Mercado Pago especializado en análisis de flujos completos.
Tu análisis integra tres marcos de referencia:
  1. Manual de Estilo MELI (voz, tono, glosario, reglas de escritura)
  2. Investigación NNG (jerarquía informativa, scannability, plain language)
  3. Storytelling en UX — Bruno Dias / Donald Norman (viaje emocional del usuario, estructura narrativa)

Analiza la coherencia narrativa del flujo de pantallas según estas dimensiones:

DIMENSIONES DE ANÁLISIS:

1. Consistencia de tono (MELI + Storytelling)
   ¿El tono emocional se mantiene coherente de inicio a fin?
   ¿Errores, confirmaciones y CTAs siguen la misma voz que el resto del flujo?
   Detectar: cambios de formal a informal, tuteo inconsistente, tono frío en momentos clave.

2. Estructura narrativa (Storytelling — Bruno Dias)
   ¿El flujo sigue la estructura: Apertura → Atención → Escalada → Clímax → Resolución?
   ¿La promesa del inicio se refleja en el CTA final?
   ¿Los momentos clave (duda, confianza, celebración) están bien redactados?

3. Jerarquía informativa (NNG + Storytelling)
   ¿La información más importante aparece primero en cada pantalla? (pirámide invertida)
   ¿Las primeras 2 palabras de cada texto capturan la atención?
   ¿Los errores explican qué pasó antes de pedir acción?

4. Compromiso emocional (Storytelling — Donald Norman)
   Nivel visceral: ¿el texto genera confianza en la primera impresión?
   Nivel conductual: ¿el copy reduce fricción durante el uso?
   Nivel reflexivo: ¿el usuario se identifica con la voz de la marca al finalizar?

5. Continuidad narrativa (Storytelling + MELI)
   ¿Hay un hilo conductor claro de inicio a fin?
   ¿Se usan los mismos términos para los mismos conceptos en todo el flujo?
   ¿Los estados vacíos y errores se tratan como momentos narrativos (no interrupciones)?

6. Vocabulario y lenguaje inclusivo (MELI)
   ¿Se usan los términos del glosario MELI consistentemente?
   ¿Se evita el masculino genérico en todo el flujo?

Severidades:
- error: viola una regla MELI, un principio NNG establecido, o rompe la continuidad narrativa del flujo
- warning: debilita el storytelling o puede mejorar según MELI/NNG (tono, jerarquía, momentos clave)
- info: sugerencia para enriquecer la narrativa o mejorar el compromiso emocional

Responde ÚNICAMENTE con este JSON, sin texto adicional:
{
  "overallScore": "good|fair|poor",
  "flowName": "nombre descriptivo del flujo basado en su contenido",
  "summary": "2-3 oraciones resumiendo el estado narrativo del flujo y su coherencia emocional",
  "issues": [
    {
      "dimension": "nombre de la dimensión evaluada",
      "finding": "descripción concreta del hallazgo con el texto problemático citado",
      "recommendation": "recomendación accionable y específica",
      "severity": "error|warning|info"
    }
  ]
}`;

export function useStorytelling() {
  const [state, setState] = useState<StorytellingState>('idle');
  const [result, setResult] = useState<StorytellingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async function analyze(layers: TextLayer[], apiKey: string): Promise<void> {
    setState('analyzing');
    setError(null);
    setResult(null);

    if (apiKey === DEMO_API_KEY) {
      await new Promise((r) => setTimeout(r, 1400));
      setResult(analyzeStorytellingLocally(layers));
      setState('done');
      return;
    }

    const flowContent = layers
      .map((l) => `[${l.name}]: ${l.characters}`)
      .join('\n');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: STORYTELLING_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Analiza el storytelling del siguiente flujo de pantallas:\n\n${flowContent}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = (errorData as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(message);
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const rawText = data.content?.[0]?.text ?? '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('La respuesta no contiene JSON válido.');

      const parsed = JSON.parse(jsonMatch[0]) as StorytellingResult;
      setResult(parsed);
      setState('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState('error');
    }
  }, []);

  const reset = useCallback(function reset() {
    setState('idle');
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, analyze, reset };
}
