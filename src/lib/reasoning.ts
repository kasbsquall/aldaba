import type { AgenteSpec } from "./cast";
import { recortar } from "./protocol";

// El razonamiento de los agentes.
//
// Solo el carril protagonista corre un modelo en vivo. Los otros cuatro publican
// trazas guionadas por el mismo canal de Portal, con la misma forma de mensaje y el
// mismo transporte: para quien mira son indistinguibles, y para la infraestructura
// cuesta cero. La razon es concreta: cinco modelos concurrentes multiplicados por
// cada visitante que abra la URL topan limites de tasa exactamente durante la
// ventana de evaluacion, que es el peor momento posible para que el tablero se
// congele. Esto se declara en el README, no se esconde.
//
// Si no hay clave de API, el protagonista tambien va guionado y la demo funciona
// igual. Nada del producto depende de que el modelo responda.

export interface PasoRazonamiento {
  texto: string;
  /** Milisegundos a esperar antes de emitir el siguiente. */
  pausa: number;
  herramienta?: { nombre: string; resumen: string };
}

const JITTER = 0.35;

/** Cadencia humana: un valor base con variacion, para que no se sienta metronomo. */
function conJitter(ms: number): number {
  return Math.round(ms * (1 - JITTER + Math.random() * JITTER * 2));
}

export function hayModeloEnVivo(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Traza guionada, especifica de la operacion que evalua cada agente. */
export function guionDe(spec: AgenteSpec): PasoRazonamiento[] {
  const monto = `${spec.monto.moneda === "USD" ? "US$" : "S/"} ${spec.monto.valor.toLocaleString("es-PE")}`;

  // Las lineas especificas de este agente, que ya estan escritas y son verificables
  // contra sus propios datos. La plantilla generica que habia antes producia frases
  // sin sentido en cuanto la contraparte no era una empresa: decia "los datos del
  // beneficiario coinciden con el contrato" hablando de la mesa de dinero interna.
  const suyas: PasoRazonamiento[] = spec.resumen.map((texto, i) => ({
    texto,
    pausa: conJitter(1500 + i * 120),
  }));

  return [
    {
      texto: `Recibí la orden: ${spec.operacion.toLowerCase()} por ${monto}.`,
      pausa: conJitter(1300),
    },
    ...suyas,
  ];
}

/** Traza generica, solo como ultimo respaldo. */
function guionGenerico(spec: AgenteSpec): PasoRazonamiento[] {
  const monto = `${spec.monto.moneda === "USD" ? "US$" : "S/"} ${spec.monto.valor.toLocaleString("es-PE")}`;

  return [
    {
      texto: `Recibí la orden: ${spec.operacion.toLowerCase()} por ${monto}.`,
      pausa: conJitter(1400),
    },
    {
      texto: `Consulto el maestro de contrapartes para ${spec.contraparte}.`,
      pausa: conJitter(1800),
      herramienta: { nombre: "maestro.contrapartes", resumen: "1 coincidencia" },
    },
    {
      texto: `Los datos del beneficiario coinciden con el contrato vigente. Sin observaciones.`,
      pausa: conJitter(1600),
    },
    {
      texto: `Verifico saldo y disponibilidad en la cuenta de origen.`,
      pausa: conJitter(1500),
      herramienta: { nombre: "tesoreria.saldo", resumen: "cobertura suficiente" },
    },
    {
      texto: `Contrasto contra la matriz de límites operativos.`,
      pausa: conJitter(1700),
      herramienta: { nombre: "riesgo.limites", resumen: "excede umbral" },
    },
    {
      texto: `${spec.regla}. No me corresponde decidir esto solo.`,
      pausa: conJitter(900),
    },
  ];
}

const SISTEMA = `Eres un agente financiero que ejecuta operaciones en una tesorería peruana.
Piensas en voz alta mientras trabajas, en primera persona y en español.
Cada paso es una sola frase corta, de menos de 140 caracteres, concreta y sin adornos.
No uses vinetas, ni numeración, ni emojis, ni guion largo.
Terminas cuando detectas que la operación excede tu límite y necesita firma humana.`;

/**
 * Traza en vivo. Devuelve `null` si no hay clave o si el modelo falla, para que el
 * llamador caiga al guion sin que la pantalla se entere.
 */
export async function trazaEnVivo(spec: AgenteSpec): Promise<PasoRazonamiento[] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const monto = `${spec.monto.moneda} ${spec.monto.valor}`;
  const prompt = `Operación: ${spec.operacion}. Monto: ${monto}. Contraparte: ${spec.contraparte}.
Regla que la detiene: ${spec.regla}.
Devuelve entre 5 y 7 pasos de tu razonamiento, uno por línea, sin numerar.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system: SISTEMA,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!r.ok) return null;

    const data = (await r.json()) as { content?: { type: string; text?: string }[] };
    const texto = data.content?.find((b) => b.type === "text")?.text ?? "";

    const pasos = texto
      .split("\n")
      .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 3)
      .slice(0, 7)
      .map<PasoRazonamiento>((linea) => ({
        texto: recortar(linea).texto,
        pausa: conJitter(1600),
      }));

    return pasos.length >= 3 ? pasos : null;
  } catch {
    // Un modelo caido no puede tumbar la demo. Se cae al guion en silencio.
    return null;
  }
}

/** La traza que le toca a este agente, en vivo si le corresponde y se puede. */
export async function trazaDe(spec: AgenteSpec): Promise<PasoRazonamiento[]> {
  if (spec.enVivo) {
    const viva = await trazaEnVivo(spec);
    if (viva) return viva;
  }
  return guionDe(spec);
}
