import { useState, useCallback } from 'react';
import { TextLayer, DEMO_API_KEY } from './useAnalysis';

export interface TextVariant {
  improvementType: string;
  text: string;
  rationale: string;
}

export interface LayerVariants {
  id: string;
  name: string;
  original: string;
  detectedIntent: string;
  messageType: string;
  variants: TextVariant[];
}

export type AlternativasState = 'idle' | 'generating' | 'done' | 'error';

// ─── Local variant generator (demo mode) ─────────────────────────────────────
// Generates variants by improvement dimension from the ACTUAL layer text.
// Rules:
//  - Never changes the message intent
//  - Never adds information not implicit in the original
//  - Never uses "usted" (MELI tutea siempre)
//  - Only generates a variant if it is genuinely different and useful

const IMP_TO_INF: Record<string, string> = {
  Crea: 'Crear', Aplica: 'Aplicar', Guarda: 'Guardar',
  Agrega: 'Agregar', Elimina: 'Eliminar', Edita: 'Editar',
  'Envía': 'Enviar', Confirma: 'Confirmar', Sube: 'Subir',
  Carga: 'Cargar', Selecciona: 'Seleccionar', Elige: 'Elegir',
  Escoge: 'Escoger', Compra: 'Comprar', Paga: 'Pagar',
  Ingresa: 'Ingresar', Cancela: 'Cancelar', Acepta: 'Aceptar',
  'Continúa': 'Continuar', Retira: 'Retirar',
};

function detectMessageType(t: string): string {
  if (/error|no (se |pudimos|pudo)|falló|inténtalo|intentá de nuevo/i.test(t)) return 'Error';
  if (/¡listo|exitosamente|completado|guardado|enviado con éxito/i.test(t)) return 'Éxito';
  if (/todavía no|aún no|no (hay |encontramos)|sin (resultados|compras|publicaciones)/i.test(t)) return 'Estado vacío';
  if (/^¿/.test(t)) return 'Ayuda';
  // CTA: starts with action verb, no sentence-ending punctuation
  if (!/[.?]$/.test(t) && /^[A-ZÁÉÍÓÚ][a-záéíóúü]+(ar|er|ir|[aeoáéó])\b/.test(t)) return 'CTA';
  return 'Informativo';
}

function detectIntent(t: string): string {
  const clean = t.replace(/[.!?]$/, '').trim();
  const lower = clean.charAt(0).toLowerCase() + clean.slice(1);
  if (clean.length <= 70) return `Invitar a la persona usuaria a ${lower}`;
  const first = clean.split(/[.!?]/)[0].trim();
  return first.length > 85 ? first.substring(0, 85) + '…' : first;
}

function add(
  variants: TextVariant[],
  improvementType: string,
  text: string,
  rationale: string,
  original: string
) {
  const t = text.trim();
  if (!t || t === original.trim()) return;
  if (variants.some(v => v.text.trim() === t)) return; // no duplicates
  if (variants.filter(v => v.improvementType === improvementType).length > 0) return; // one per type
  variants.push({ improvementType, text: t, rationale });
}

function generateVariantsLocally(layer: TextLayer): LayerVariants {
  const original = layer.characters.trim();
  const messageType = detectMessageType(original);
  const detectedIntent = detectIntent(original);
  const V: TextVariant[] = [];

  // ── más directo: remove padding and optional qualifiers ──────────────────
  {
    const v = original
      .replace(/\s+(que prefieras|que quieras|que desees|que más te guste)\b/gi, '')
      .replace(/\s+(de (una )?forma (fácil|rápida|sencilla|simple))\b/gi, '')
      .replace(/\s+(muy (fácil|rápido|simple))\b/gi, '')
      .replace(/\s+(en (solo |unos )?(pocos )?(pasos|clics|minutos))\b/gi, '')
      .trim();
    add(V, 'más directo', v, 'Se eliminaron palabras de relleno para ir al núcleo del mensaje.', original);
  }

  // ── más escaneable: for compound CTAs, isolate primary action ─────────────
  if (messageType === 'CTA' && / y /.test(original)) {
    const primaryAction = original.split(/ y /)[0].trim();
    add(V, 'más escaneable', primaryAction,
      'Los CTAs efectivos tienen una sola acción. Se aisló la acción principal.', original);
  }

  // ── más escaneable: front-load key info in long texts ─────────────────────
  if (messageType === 'Informativo' && original.length > 50) {
    const sub = original.match(/^(Si|Cuando|Para|Una vez que)\s+(.+?),\s+(.+)/i);
    if (sub) {
      const v = `${sub[3].trim().charAt(0).toUpperCase() + sub[3].trim().slice(1)} — ${sub[1].toLowerCase()} ${sub[2].trim()}`;
      add(V, 'más escaneable', v, 'Se adelantó la información más relevante (pirámide invertida).', original);
    } else if (original.length > 100) {
      const first = original.split(/[.!?]+/)[0].trim();
      if (first && first.length > 10) {
        add(V, 'más escaneable', first + '.',
          'Se redujo a la idea principal. El texto restante puede ir en un párrafo de apoyo.', original);
      }
    }
  }

  // ── más claro: imperative → infinitive for CTAs (MELI standard) ──────────
  if (messageType === 'CTA') {
    let v = original;
    for (const [imp, inf] of Object.entries(IMP_TO_INF)) {
      v = v.replace(new RegExp(`\\b${imp}\\b`, 'g'), inf);
    }
    add(V, 'más claro', v,
      'MELI usa infinitivo en CTAs (Crear, Aplicar). Se convirtió el imperativo a infinitivo.', original);
  }

  // ── más claro: simplify vocabulary ───────────────────────────────────────
  {
    const v = original
      .replace(/\butilizar\b/gi, 'usar')
      .replace(/\butiliza\b/gi, 'usa')
      .replace(/\butilizá\b/gi, 'usá')
      .replace(/\brealizar\b/gi, 'hacer')
      .replace(/\bverificar\b/gi, 'revisar')
      .replace(/\bvisualizar\b/gi, 'ver')
      .replace(/\bcontar con\b/gi, 'tener')
      .replace(/\bproceder a\s+/gi, '')
      .trim();
    add(V, 'más claro', v, 'Se simplificó el vocabulario (plain language) para reducir la carga cognitiva.', original);
  }

  // ── más empático: user-subject instead of system-subject ─────────────────
  {
    const v = original
      .replace(/^(La sección|El sistema|La (app|aplicación)|La plataforma)\s+(te )?permite\s+/gi, 'Podés ')
      .replace(/^(La sección|El sistema|La plataforma)\s+/gi, 'Desde aquí ')
      .replace(/^(Se puede|Es posible)\s+/gi, 'Podés ')
      .replace(/\b(inválido|incorrecto)\b/gi, 'no reconocido')
      .trim();
    const cap = v.charAt(0).toUpperCase() + v.slice(1);
    add(V, 'más empático', cap,
      'Se reemplazó el sujeto del sistema por la persona usuaria para mayor cercanía.', original);
  }

  // ── más orientado a beneficio: flip "X para Y" → "Y: X" ──────────────────
  if (messageType === 'Informativo') {
    const m = original.match(/^(.+?)\s+para\s+(que\s+puedas?\s+|podás?\s+)?(.+)/i);
    if (m && m[3].trim().length < original.length * 0.7) {
      const benefit = m[3].trim().replace(/\.$/, '');
      const action = m[1].trim();
      const v = `${benefit.charAt(0).toUpperCase() + benefit.slice(1)}: ${action.charAt(0).toLowerCase() + action.slice(1)}`;
      add(V, 'más orientado a beneficio', v,
        'Se invirtió la estructura para destacar primero el beneficio de la persona usuaria.', original);
    }
  }

  return {
    id: layer.id,
    name: layer.name,
    original: layer.characters,
    detectedIntent,
    messageType,
    variants: V.slice(0, 5),
  };
}

// ─── Claude API prompt ────────────────────────────────────────────────────────
const ALTERNATIVAS_PROMPT = `Eres un asesor senior de UX Writing especializado en interfaces de Mercado Libre y Mercado Pago.

Tu tarea es generar variantes de texto manteniendo la intención original y mejorando solo la dimensión solicitada.

REGLAS OBLIGATORIAS:
1. No cambies la intención del mensaje original.
2. No agregues información nueva que no esté implícita en el texto.
3. No inventes beneficios, condiciones ni acciones.
4. No uses frases vacías ni genéricas.
5. No hagas el texto más largo si no aporta claridad.
6. No culpes a la persona usuaria.
7. No cambies el tipo de mensaje: CTA, Error, Éxito, Estado vacío, Informativo o Ayuda.
8. Si el texto ya es claro, mejora solo lo mínimo necesario.
9. Prioriza lenguaje simple, natural y directo.
10. Devuelve variantes que realmente sirvan para usar en producto.
11. SIEMPRE tutear (tú/vos). NUNCA usar "usted". MELI no usa "usted".
12. CTAs en infinitivo (Crear, Guardar, Aplicar), no en imperativo (Crea, Guarda).

INTENCIONES DE MEJORA DISPONIBLES:
- más directo
- más claro
- más empático
- más orientado a acción
- más orientado a beneficio
- más escaneable

ANTES DE ESCRIBIR, analiza:
- cuál es la acción principal
- cuál es el contexto del mensaje
- qué fricción tiene el texto original
- qué intención de mejora corresponde mejor

Si una intención no aplica al texto, no la fuerces. Devuelve solo las variantes que aporten valor real.

Responde ÚNICAMENTE con este JSON, sin texto adicional:
{
  "layers": [
    {
      "id": "id-del-layer",
      "name": "nombre-del-layer",
      "original": "texto original",
      "detectedIntent": "descripción de la intención del texto en una oración",
      "messageType": "CTA|Error|Éxito|Estado vacío|Informativo|Ayuda",
      "variants": [
        {
          "improvementType": "más directo|más claro|más empático|más orientado a acción|más orientado a beneficio|más escaneable",
          "text": "texto variante",
          "rationale": "1 oración explicando qué se mejoró y por qué"
        }
      ]
    }
  ]
}`;

export function useAlternativas() {
  const [state, setState] = useState<AlternativasState>('idle');
  const [results, setResults] = useState<LayerVariants[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async function generate(layers: TextLayer[], apiKey: string): Promise<void> {
    setState('generating');
    setError(null);
    setResults([]);

    if (apiKey === DEMO_API_KEY) {
      await new Promise((r) => setTimeout(r, 1000));
      setResults(layers.map(generateVariantsLocally));
      setState('done');
      return;
    }

    const userContent = layers
      .map((l) => `Layer ID: ${l.id}\nLayer Name: ${l.name}\nTexto: ${l.characters}`)
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
          system: ALTERNATIVAS_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Genera variantes para los siguientes layers de texto:\n\n${userContent}`,
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

      const parsed = JSON.parse(jsonMatch[0]) as { layers: LayerVariants[] };
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

  return { state, results, error, generate, reset };
}
