import { useState, useCallback } from 'react';
import { TextLayer, DEMO_API_KEY } from './useAnalysis';

export interface AnalysisContext {
  contentType: string;
  objective: string;
  extraContext: string;
}

export interface ConfusionPoint {
  element: string;
  issue: string;
  suggestion: string;
}

export interface EntendimientoResult {
  overallClarity: 'clear' | 'moderate' | 'confusing';
  userSummary: string;
  firstImpression: string;
  keyMessages: string[];
  potentialConfusions: ConfusionPoint[];
  callToAction: string;
}

export type EntendimientoState = 'idle' | 'evaluating' | 'done' | 'error';

// ─── Local user-perspective evaluator (demo mode) ─────────────────────────────
// Simulates what a real user would understand from the actual layer content.
// Uses the AnalysisContext to tailor the evaluation to the type of content.

function ex(text: string, max = 60): string {
  return text.length > max ? text.substring(0, max) + '…' : text;
}

function evaluateEntendimientoLocally(
  layers: TextLayer[],
  context: AnalysisContext
): EntendimientoResult {
  const texts = layers.map(l => l.characters.trim()).filter(t => t.length > 0);
  const isEducational = /educativ|aprendizaje|guía|ayuda|artículo|tutorial/i.test(context.contentType);
  const isFlow = /flujo|onboarding|compra|registro|pago/i.test(context.contentType);

  if (texts.length === 0) {
    return {
      overallClarity: 'confusing',
      userSummary: 'No encuentro texto en esta selección. No puedo entender qué se supone que debo hacer aquí.',
      firstImpression: 'La pantalla parece estar vacía o los textos no son accesibles.',
      keyMessages: [],
      potentialConfusions: [],
      callToAction: 'No detecté ningún CTA en la pantalla.',
    };
  }

  const combined = texts.join('\n');

  // ── Structural classification ─────────────────────────────────────────────────
  const titleCandidates = texts.filter(t => t.length >= 12 && t.length <= 100 && !/\.$/.test(t));
  const bodyTexts = texts.filter(t => t.length > 100);
  const shortTexts = texts.filter(t => t.length > 0 && t.length <= 35);
  const questions = texts.filter(t => t.startsWith('¿'));
  const primaryTitle = titleCandidates[0] ?? texts[0] ?? '';

  // ── Find the primary CTA ──────────────────────────────────────────────────────
  const ctaCandidates = shortTexts.filter(t =>
    /^[A-ZÁÉÍÓÚ][a-záéíóúü]+(ar|er|ir)\b/.test(t) ||
    /^(Comenzar|Empezar|Acceder|Registrar|Crear|Explorar|Ir|Descubrir|Solicitar|Guardar|Continuar|Aceptar|Cancelar|Comprar|Pagar)\b/i.test(t)
  );
  // Take the LAST candidate: both educational content and flow screens place
  // the primary CTA at the bottom, after all explanatory text.
  const primaryCTA = ctaCandidates[ctaCandidates.length - 1] ?? null;

  // ── Key messages the user would retain ───────────────────────────────────────
  const keyMessagePool = texts
    .filter(t => t !== primaryTitle && t.length >= 15 && t.length <= 120)
    .slice(0, 3);
  const keyMessages = (keyMessagePool.length > 0 ? keyMessagePool : texts.slice(0, 3))
    .map(t => ex(t, 90));

  // ── userSummary ───────────────────────────────────────────────────────────────
  const titleSnippet = primaryTitle.length > 0 ? `"${ex(primaryTitle, 55)}"` : 'sin título claro';
  const objectiveClue = context.objective
    ? ` El objetivo declarado es: ${context.objective.trim().toLowerCase()}.`
    : '';

  let userSummary: string;
  if (isEducational) {
    userSummary = primaryTitle.length > 0
      ? `Al leer esta pieza entiendo que es un contenido sobre ${titleSnippet}. ${
          bodyTexts.length > 2
            ? 'Hay mucha información y me cuesta saber qué es lo más importante que debo retener.'
            : 'El contenido es manejable y parece explicar el tema de forma progresiva.'
        }${objectiveClue}`
      : `No hay un título claro que me diga de qué trata este contenido. Tengo que leer el cuerpo para orientarme, lo que genera fricción desde el inicio.${objectiveClue}`;
  } else {
    userSummary = primaryTitle.length > 0
      ? `Al ver esta pantalla entiendo que se trata de ${titleSnippet}. ${
          bodyTexts.length > 2
            ? 'Hay bastante texto para leer antes de entender qué se espera de mí.'
            : 'El contenido es breve y parece pedirme que tome una acción.'
        }${objectiveClue}`
      : `La pantalla no tiene un encabezado claro. Tengo que leer el cuerpo para entender el contexto, lo cual me genera fricción desde el primer momento.${objectiveClue}`;
  }

  // ── firstImpression ───────────────────────────────────────────────────────────
  let firstImpression: string;
  if (primaryTitle.length > 0) {
    if (isEducational) {
      firstImpression = `Lo primero que veo es ${titleSnippet}. ${
        bodyTexts.length > 2
          ? 'Debajo hay mucho texto y no tengo claro cuál es la idea principal que debo retener. Necesito leer todo para entender el tema.'
          : 'El resto del contenido parece desarrollar ese tema de forma clara.'
      }`;
    } else {
      firstImpression = `Lo primero que capta mi atención es ${titleSnippet}. ${
        bodyTexts.length > 2
          ? 'Debajo hay mucho texto y no sé si debo leerlo todo antes de actuar o puedo ir directo al botón.'
          : 'El resto del contenido parece apoyar ese mensaje principal sin sobrecargarme.'
      }`;
    }
  } else {
    firstImpression = `No hay un título que me oriente. Mi atención cae sobre el primer texto visible: "${ex(texts[0], 55)}". No me indica inmediatamente de qué trata ${isEducational ? 'el contenido' : 'la pantalla'}.`;
  }

  // ── Potential confusions ──────────────────────────────────────────────────────
  const potentialConfusions: ConfusionPoint[] = [];

  // High body density — educational vs. flow framing
  if (bodyTexts.length > 2) {
    potentialConfusions.push({
      element: `Volumen de texto (${bodyTexts.length} bloques largos)`,
      issue: isEducational
        ? `Hay demasiado texto seguido sin puntos de respiración. Me cuesta distinguir las ideas principales de los detalles secundarios.`
        : `Hay demasiado texto para procesar antes de llegar a la acción. Es fácil que me pierda o abandone sin leer lo importante.`,
      suggestion: isEducational
        ? 'Dividir en secciones cortas con encabezados descriptivos. Priorizar los 3 conceptos clave que el usuario debe retener.'
        : 'Reducir el cuerpo a lo mínimo necesario. El objetivo es que la persona usuaria entienda de inmediato qué se espera.',
    });
  }

  // FAQ fragmentation
  if (questions.length >= 2) {
    potentialConfusions.push({
      element: `Secciones de pregunta (${questions.length} encontradas)`,
      issue: isEducational
        ? `Las preguntas fragmentan el hilo del contenido educativo. Me cuesta seguir el razonamiento cuando el texto salta entre preguntas y respuestas.`
        : `Las preguntas me hacen pensar que esta es una pantalla informativa, no de acción. No sé si debo leerlas antes de hacer algo.`,
      suggestion: isEducational
        ? 'Para contenido educativo, las preguntas funcionan bien si son pocas y están ordenadas de menor a mayor complejidad. Más de 3 rompen el flujo de aprendizaje.'
        : 'Mover las FAQs a una sección de ayuda secundaria. El camino hacia el CTA debe ser directo.',
    });
  }

  // Long title
  if (primaryTitle.length > 80) {
    potentialConfusions.push({
      element: 'Título principal',
      issue: `"${ex(primaryTitle, 65)}" — el título es muy largo. Tengo que leerlo completo para entender de qué trata, lo que frena mi primer escaneo.`,
      suggestion: 'NNG: los títulos ideales tienen 40–60 caracteres. Condensar el mensaje principal y mover el detalle al subtítulo.',
    });
  }

  // Missing CTA for flow content
  if (!isEducational && !primaryCTA && shortTexts.length < 2) {
    potentialConfusions.push({
      element: 'Acción principal',
      issue: 'No encuentro un botón o texto claro que me diga qué tengo que hacer. La pantalla me informa pero no me guía a un paso concreto.',
      suggestion: 'Agregar un CTA en infinitivo que resuma la acción esperada (ej: "Guardar", "Continuar", "Registrar mi marca").',
    });
  }

  // Generic CTA
  if (primaryCTA && /^(Ver|Más|Siguiente|OK|Si$|No$)\b/i.test(primaryCTA)) {
    potentialConfusions.push({
      element: `Botón: "${primaryCTA}"`,
      issue: `"${primaryCTA}" es demasiado genérico. No sé qué va a pasar exactamente cuando lo toque.`,
      suggestion: 'Reemplazar con un verbo específico que describa el resultado (ej: en lugar de "Ver", usar "Ver mis pedidos").',
    });
  }

  // Objective alignment check
  if (context.objective.trim().length > 0 && isEducational) {
    const objWords = context.objective.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const matchCount = objWords.filter(w => combined.toLowerCase().includes(w)).length;
    if (objWords.length > 3 && matchCount < objWords.length * 0.4) {
      potentialConfusions.push({
        element: 'Alineación con el objetivo',
        issue: `El objetivo declarado es "${ex(context.objective, 70)}" pero el contenido no parece abordarlo directamente. Me cuesta conectar lo que leo con lo que se supone que debo aprender.`,
        suggestion: 'Revisar que el título y el primer párrafo hagan explícito el tema del objetivo. La persona usuaria no puede leer la mente de quien escribe.',
      });
    }
  }

  // ── CTA evaluation ────────────────────────────────────────────────────────────
  let callToAction: string;
  if (isEducational) {
    if (primaryCTA) {
      callToAction = `Veo el texto "${primaryCTA}". En un contenido educativo, los CTAs secundarios deben invitar a explorar más (ej: "Ver más sobre X") o a poner en práctica lo aprendido (ej: "Ir a Productos de catálogo"). "${primaryCTA}" ${/^[A-ZÁÉÍÓÚ][a-záéíóúü]+(ar|er|ir)\b/.test(primaryCTA) ? 'cumple con eso.' : 'podría ser más específico.'}`;
    } else {
      callToAction = 'No encontré un CTA claro. En contenido educativo, al final es útil tener un paso concreto que la persona usuaria pueda dar para aplicar lo que aprendió.';
    }
  } else if (primaryCTA) {
    if (/^(Ver|Más|Siguiente|OK|Si$|No$)\b/i.test(primaryCTA)) {
      callToAction = `El botón "${primaryCTA}" es demasiado genérico. No me queda claro adónde me lleva ni qué se ejecuta al tocarlo. Necesito un verbo más específico.`;
    } else if (/^[A-ZÁÉÍÓÚ][a-záéíóúü]+(ar|er|ir)\b/.test(primaryCTA)) {
      callToAction = `El botón "${primaryCTA}" es claro: entiendo qué acción voy a ejecutar. Podría ganar más fuerza si agrega el objeto directo (ej: "${primaryCTA} mis cambios" o "${primaryCTA} mi perfil").`;
    } else {
      callToAction = `El texto "${primaryCTA}" me orienta sobre la acción siguiente. Es directo y comprensible.`;
    }
  } else if (shortTexts.length > 0) {
    callToAction = `El texto más corto que encuentro es "${ex(shortTexts[0], 30)}" pero no tengo claro si es el CTA principal o una etiqueta. Necesito mayor jerarquía o un verbo más explícito.`;
  } else {
    callToAction = 'No encontré un CTA claro. Sin una acción visible, no sé cuál es el paso siguiente que se espera de mí.';
  }

  // ── Overall clarity ───────────────────────────────────────────────────────────
  const confusionCount = potentialConfusions.length;
  const overallClarity: 'clear' | 'moderate' | 'confusing' =
    confusionCount === 0 ? 'clear'    :
    confusionCount <= 2  ? 'moderate' :
                           'confusing';

  return { overallClarity, userSummary, firstImpression, keyMessages, potentialConfusions, callToAction };
}

const ENTENDIMIENTO_PROMPT = `Eres una persona usuaria promedio de Mercado Libre o Mercado Pago. Vas a leer los textos de una pantalla o pieza de contenido y explicar cómo los entendés, como si fuera tu primera vez viendo esta interfaz o este contenido.

El equipo de diseño te dará contexto sobre qué tipo de pieza es y qué objetivo tiene. Usá ese contexto para enfocar tu evaluación.

Tu análisis debe responder desde la perspectiva de la persona usuaria:
- ¿Qué entiendo al leer este contenido?
- ¿El contenido cumple con lo que el equipo quiere que yo entienda o haga?
- ¿Qué mensajes clave recibo?
- ¿Hay algo que me confunde o no queda claro?
- Si hay un CTA: ¿me queda claro qué va a pasar si lo toco?

Responde ÚNICAMENTE con este JSON, sin texto adicional:
{
  "overallClarity": "clear|moderate|confusing",
  "userSummary": "1-2 oraciones en primera persona describiendo qué entiende la persona usuaria al leer este contenido",
  "firstImpression": "1-2 oraciones sobre qué captura la atención primero y qué mensaje comunica",
  "keyMessages": ["mensaje 1", "mensaje 2", "mensaje 3"],
  "potentialConfusions": [
    {
      "element": "nombre del elemento que genera confusión",
      "issue": "descripción del problema de comprensión desde la perspectiva de la persona usuaria",
      "suggestion": "recomendación concreta para clarificarlo"
    }
  ],
  "callToAction": "evaluación del CTA o próximo paso: ¿es claro qué va a pasar al tocarlo o seguirlo?"
}`;

export function useEntendimiento() {
  const [state, setState] = useState<EntendimientoState>('idle');
  const [result, setResult] = useState<EntendimientoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async function evaluate(
    layers: TextLayer[],
    apiKey: string,
    context: AnalysisContext
  ): Promise<void> {
    setState('evaluating');
    setError(null);
    setResult(null);

    if (apiKey === DEMO_API_KEY) {
      await new Promise((r) => setTimeout(r, 1200));
      setResult(evaluateEntendimientoLocally(layers, context));
      setState('done');
      return;
    }

    const contextBlock = [
      `Tipo de pieza: ${context.contentType}`,
      `Objetivo del análisis: ${context.objective}`,
      context.extraContext.trim() ? `Contexto adicional: ${context.extraContext.trim()}` : '',
    ].filter(Boolean).join('\n');

    const screenContent = layers
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
          system: ENTENDIMIENTO_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Contexto del equipo de diseño:\n${contextBlock}\n\nEvaluá cómo una persona usuaria entiende este contenido:\n\n${screenContent}`,
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

      const parsed = JSON.parse(jsonMatch[0]) as EntendimientoResult;
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

  return { state, result, error, evaluate, reset };
}
