import { useState, useCallback } from 'react';
import { SYSTEM_PROMPT } from '../prompt';

export const DEMO_API_KEY = '__demo__';

// ─── Local rule-based analyzer (used in demo mode) ───────────────────────────
// Scans the actual layer text for violations from TWO complementary sources:
//   · MELI Manual de Estilo (brand-specific rules for Mercado Libre / Mercado Pago)
//   · Nielsen Norman Group research (universal UX writing principles)
// Results always match the real content — no fake or mismatched issues.

interface RuleSpec {
  re: RegExp;
  rule: string;
  explanation: string;
  getRecommended: (match: string, fullText: string) => string;
  severity: 'error' | 'warning' | 'info';
  /** Skip rule if text is longer than this (avoids flagging body paragraphs) */
  maxLength?: number;
}

// ── MELI: imperative → infinitive map ────────────────────────────────────────
const IMPERATIVE_MAP: Record<string, string> = {
  Guarda: 'Guardar', 'Continúa': 'Continuar', Acepta: 'Aceptar',
  Cancela: 'Cancelar', Agrega: 'Agregar', Elimina: 'Eliminar',
  Edita: 'Editar', 'Envía': 'Enviar', Confirma: 'Confirmar',
  Sube: 'Subir', Carga: 'Cargar', Selecciona: 'Seleccionar',
  Escoge: 'Escoger', Elige: 'Elegir', Compra: 'Comprar',
  Paga: 'Pagar', Retira: 'Retirar', Ingresa: 'Ingresar',
};

const LOCAL_RULES: RuleSpec[] = [

  // ════════════════════════════════════════════════
  // MELI Manual de Estilo — Glosario y terminología
  // ════════════════════════════════════════════════

  {
    re: /\bclickea[rn]?\b|\bcliquea[rn]?\b/i,
    rule: 'Glosario MELI — término no aprobado',
    explanation: '"Clickea" o "cliquea" no están en el glosario aprobado. MELI estandariza "haz clic" para mantener consistencia y evitar anglicismos coloquiales.',
    getRecommended: () => 'haz clic',
    severity: 'error',
  },
  {
    re: /\bHome\b/,
    rule: 'Glosario MELI — usar "Inicio"',
    explanation: 'MELI usa "Inicio" de forma consistente en todas sus plataformas. Anglicismos como "Home" deben reemplazarse por sus equivalentes en español.',
    getRecommended: () => 'Inicio',
    severity: 'error',
  },
  {
    re: /\bloguea[rnte]+\b|\bloguearse\b/i,
    rule: 'Glosario MELI — término no aprobado',
    explanation: '"Loguearse" y sus variantes son anglicismos no aprobados en el glosario MELI. Usar "iniciar sesión".',
    getRecommended: () => 'iniciar sesión',
    severity: 'error',
  },
  {
    re: /\bchequear?\b|\bchequeá\b/i,
    rule: 'Glosario MELI — término no aprobado',
    explanation: '"Chequear" es un anglicismo no aprobado por el Manual de Estilo MELI. Usar "verificar" o "revisar" según el contexto.',
    getRecommended: () => 'verificar',
    severity: 'error',
  },
  {
    re: /\bpassword\b/i,
    rule: 'Glosario MELI — usar "contraseña"',
    explanation: '"Password" es un anglicismo. El Manual de Estilo MELI establece usar siempre "contraseña" en todas las interfaces.',
    getRecommended: () => 'contraseña',
    severity: 'error',
  },
  {
    re: /\bfree\b/i,
    rule: 'Glosario MELI — usar "gratis"',
    explanation: '"Free" es un anglicismo no aprobado. El Manual de Estilo MELI indica usar "gratis" o "sin costo".',
    getRecommended: () => 'gratis',
    severity: 'error',
  },
  {
    re: /\bmail\b/i,
    rule: 'Glosario MELI — usar "correo electrónico"',
    explanation: '"Mail" debe reemplazarse por "correo electrónico" o "email" según el glosario oficial MELI.',
    getRecommended: () => 'correo electrónico',
    severity: 'error',
  },

  // ════════════════════════════════════════════════
  // MELI + NNG — Botones y CTAs (ambas fuentes)
  // ════════════════════════════════════════════════

  {
    re: /\bOK\b/,
    rule: 'Botón vago — MELI + NNG',
    explanation: '"OK" no describe qué sucederá después del clic. MELI no lo incluye como término válido para CTAs, y NNG recomienda que los botones describan el estado resultante. Especificar la acción: "Aceptar", "Entendido", "Confirmar".',
    getRecommended: () => 'Aceptar',
    severity: 'error',
  },
  {
    re: new RegExp(`^(${Object.keys(IMPERATIVE_MAP).join('|')})\\b`),
    rule: 'Botón en imperativo — Manual MELI',
    explanation: 'El Manual de Estilo MELI exige infinitivo en todos los CTAs, no imperativo. El imperativo suena más agresivo y contradice el tono cercano de la marca.',
    getRecommended: (m) => IMPERATIVE_MAP[m] ?? m + 'r',
    severity: 'error',
    maxLength: 40,
  },

  // ════════════════════════════════════════════════
  // MELI — Tuteo e inclusividad
  // ════════════════════════════════════════════════

  {
    re: /\busted\b/i,
    rule: 'Tuteo — evitar "usted" (MELI)',
    explanation: 'MELI tutea siempre a sus usuarios. "Usted" genera distancia formal que contradice la voz cercana y solícita de la marca definida en el Manual de Estilo.',
    getRecommended: () => 'tú',
    severity: 'error',
  },
  {
    re: /\bbienvenido\b/i,
    rule: 'Lenguaje inclusivo — MELI',
    explanation: 'El masculino genérico excluye a personas que no se identifican con él. El Manual de Estilo MELI indica usar formas neutras como "ya estás dentro" o "tu cuenta está lista".',
    getRecommended: () => 'Ya estás dentro',
    severity: 'warning',
  },

  // ════════════════════════════════════════════════
  // MELI + NNG — Links y texto ancla (ambas fuentes)
  // ════════════════════════════════════════════════

  {
    re: /haz clic aqu[ií]\b|clic aqu[ií]\b|\baqu[ií]\b/i,
    rule: 'Link no descriptivo — MELI + NNG',
    explanation: 'Tanto el Manual MELI como NNG (principio 4Ss) prohíben "aquí" como texto de link. El label debe describir el destino, no la acción. Los usuarios de lectores de pantalla escuchan los links fuera de contexto.',
    getRecommended: () => '[descripción del destino]',
    severity: 'error',
  },
  {
    re: /\bsaber más\b|\bver más\b|\bmás información\b|\blearn more\b/i,
    rule: 'Link genérico — MELI + NNG',
    explanation: 'MELI y NNG coinciden: links como "saber más" o "ver más" son ambiguos y no informan el destino. NNG (4Ss) requiere que el link sea Específico y Sustancial; MELI prohíbe links no descriptivos.',
    getRecommended: () => '[describir el destino específico]',
    severity: 'error',
    maxLength: 60,
  },

  // ════════════════════════════════════════════════
  // MELI + NNG — Puntuación en microcontent (ambas fuentes)
  // ════════════════════════════════════════════════

  {
    re: /\.$/,
    rule: 'Punto final en título o botón — MELI + NNG',
    explanation: 'MELI establece que títulos, botones y labels no llevan punto final. NNG coincide: el punto interrumpe el flujo visual de escaneo en microcontent y es propio de párrafos.',
    getRecommended: (_m, full) => full.trimEnd().replace(/\.$/, ''),
    severity: 'error',
    maxLength: 80,
  },

  // ════════════════════════════════════════════════
  // NNG — Principios de plain language y tono
  // ════════════════════════════════════════════════

  {
    re: /\b(muy|realmente|sumamente|extremadamente|increíblemente)\b/i,
    rule: 'Intensificador vacío — Plain Language NNG',
    explanation: 'NNG identifica los intensificadores vacíos ("muy", "realmente") como palabras que reducen la scannability y credibilidad del texto sin aportar información real. Los usuarios perciben a los autores claros como más confiables.',
    getRecommended: (_m, full) => full.replace(/\b(muy|realmente|sumamente|extremadamente|increíblemente)\b\s*/i, '').trim(),
    severity: 'warning',
  },
  {
    re: /\butilizar\b|\butiliza\b|\butilizá\b/i,
    rule: 'Lenguaje complejo — Plain Language NNG',
    explanation: 'NNG recomienda "usar" sobre "utilizar": comunican lo mismo pero "usar" tiene menor carga cognitiva. La simplicidad genera credibilidad según la investigación NNG.',
    getRecommended: (m) => m.replace(/utilizar/i, 'usar').replace(/utiliza/i, 'usa').replace(/utilizá/i, 'usá'),
    severity: 'info',
  },
  {
    re: /^(entendemos que|sabemos que|somos conscientes de que)/i,
    rule: 'Apertura inauténtica — Tono NNG',
    explanation: 'NNG encontró que frases como "Entendemos que..." suenan inauténticas sin evidencia. Los usuarios no las creen. Es mejor demostrar comprensión con acciones concretas.',
    getRecommended: () => '[reemplazar con una solución o acción directa]',
    severity: 'warning',
    maxLength: 120,
  },

  // ════════════════════════════════════════════════
  // NNG — Dark patterns de copy
  // ════════════════════════════════════════════════

  {
    re: /\b(última oportunidad|solo hoy|por tiempo limitado|oferta termina)\b/i,
    rule: 'Urgencia artificial — Dark Pattern NNG',
    explanation: 'NNG y la investigación en choice architecture muestran que el lenguaje de urgencia artificial explota el sesgo de aversión a la pérdida. Puede generar conversiones cortas pero destruye confianza a largo plazo.',
    getRecommended: () => '[comunicar el valor sin presión artificial]',
    severity: 'error',
  },

  // ════════════════════════════════════════════════
  // NNG — Mensajes de error
  // ════════════════════════════════════════════════

  {
    re: /\bocurrió un error\b|\balgo salió mal\b|\bsomething went wrong\b/i,
    rule: 'Error genérico — NNG + MELI',
    explanation: 'Tanto MELI como NNG señalan que los mensajes de error genéricos no son constructivos. El usuario necesita saber: (1) qué pasó, (2) por qué, y (3) cómo resolverlo. Los errores vagos generan frustración y abandono.',
    getRecommended: () => '[describir qué pasó + cómo resolverlo]',
    severity: 'error',
  },
];

function analyzeTextLocally(text: string): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (const spec of LOCAL_RULES) {
    if (spec.maxLength !== undefined && text.length > spec.maxLength) continue;
    const match = text.match(spec.re);
    if (!match || !match[0]) continue;
    const key = `${spec.rule}:${match[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({
      rule: spec.rule,
      found: match[0],
      explanation: spec.explanation,
      recommended: spec.getRecommended(match[0], text),
      severity: spec.severity,
    });
  }

  return issues;
}

function buildDemoResults(layers: TextLayer[]): LayerAnalysis[] {
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    issues: analyzeTextLocally(layer.characters),
  }));
}

export interface TextLayer {
  id: string;
  name: string;
  characters: string;
}

export interface Issue {
  rule: string;
  found: string;         // Texto o palabra actual
  explanation: string;   // Oportunidad — descripción detallada del problema
  recommended: string;   // Texto o palabra recomendados
  severity: 'error' | 'warning' | 'info';
}

export interface LayerAnalysis {
  id: string;
  name: string;
  issues: Issue[];
}

export type AnalysisState = 'idle' | 'analyzing' | 'done' | 'error';

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [results, setResults] = useState<LayerAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async function analyze(layers: TextLayer[], apiKey: string): Promise<void> {
    setState('analyzing');
    setError(null);
    setResults([]);

    // Demo mode — return mock data without calling the API
    if (apiKey === DEMO_API_KEY) {
      await new Promise((r) => setTimeout(r, 1200)); // simulate network delay
      setResults(buildDemoResults(layers));
      setState('done');
      return;
    }

    const userContent = layers
      .map(
        (l) =>
          `Layer ID: ${l.id}\nLayer Name: ${l.name}\nTexto: ${l.characters}`
      )
      .join('\n\n---\n\n');

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
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Analiza los siguientes layers de texto de una interfaz de Mercado Libre/Mercado Pago:\n\n${userContent}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          (errorData as { error?: { message?: string } })?.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(message);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
      const rawText = data.content?.[0]?.text ?? '';

      // Extract JSON even if the model wraps it in markdown fences
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('La respuesta no contiene JSON válido.');
      }

      const parsed = JSON.parse(jsonMatch[0]) as { layers: LayerAnalysis[] };
      // Back-compat: if model returns old `suggestion` field, map it
      for (const layer of parsed.layers ?? []) {
        for (const issue of layer.issues ?? []) {
          const anyIssue = issue as Issue & { suggestion?: string };
          if (!issue.explanation && anyIssue.suggestion) issue.explanation = anyIssue.suggestion;
          if (!issue.recommended && anyIssue.suggestion) issue.recommended = anyIssue.suggestion;
        }
      }
      setResults(parsed.layers ?? []);
      setState('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState('error');
    }
  }, []);

  const reset = useCallback(function reset() {
    setState('idle');
    setResults([]);
    setError(null);
  }, []);

  return { state, results, error, analyze, reset };
}
