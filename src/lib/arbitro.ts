import type { AgenteSpec } from "./cast";

/* El árbitro.
 *
 * Aquí es donde la IA deja de ser decorativa.
 *
 * El enrutamiento por presencia es un `sort` y debe seguir siéndolo: quién está
 * conectado y libre no es una pregunta de criterio. Pero cuando hay más agentes
 * bloqueados que personas libres, alguien tiene que decidir quién se lleva a la única
 * persona disponible, y ahí no existe respuesta correcta anticipable. Es una
 * combinatoria viva de severidad, monto, plazo restante y tiempo ya congelado, contra
 * un número de humanos que cambia cada segundo.
 *
 * Un modelo lee ese estado y devuelve un orden más el motivo en lenguaje natural. Y
 * el motivo puede ser contraintuitivo: ceder el turno al monto menor porque la
 * planilla vence antes. Quítale el modelo y hay que escribir la regla a mano, y
 * cualquier regla escrita a mano se lee como lo que es.
 *
 * El modelo decide el ORDEN DE LA COLA, nunca la operación. Un agente solo puede
 * ceder, retener o reducir alcance. Si la máquina pudiera aprobar el dinero, toda la
 * cadena de escalamiento sería decoración y el producto se quedaría sin premisa.
 */

// Haiku y no Sonnet. La tarea es ordenar cinco elementos por severidad, monto y
// tiempo congelado, y escribir una frase de menos de 130 caracteres. Eso no pide el
// modelo grande. Medido: 260 tokens de entrada y 257 de salida por llamada, con un
// tope de un arbitraje cada 12 segundos. Si la calidad del motivo bajara, el respaldo
// determinista sigue detras y la pantalla no se entera.
const MODELO = "claude-haiku-4-5-20251001";

export interface EnDisputa {
  agente: AgenteSpec;
  /** Segundos que lleva congelado esperando una firma. */
  congeladoSeg: number;
}

export interface Arbitraje {
  /** Ids de agente, del que se lleva la persona al que espera más. */
  orden: string[];
  /** Una frase, visible en pantalla, explicando por qué. */
  motivo: string;
  /** `true` cuando lo resolvió el modelo, `false` cuando cayó a la regla de respaldo. */
  porModelo: boolean;
}

function moneda(m: { valor: number; moneda: string }) {
  return `${m.moneda === "USD" ? "US$" : "S/"} ${m.valor.toLocaleString("es-PE")}`;
}

/** Respaldo determinista. Severidad, y a igualdad el que lleva más congelado. */
function porRegla(disputa: EnDisputa[]): Arbitraje {
  const orden = [...disputa].sort((a, b) => {
    const s = (d: EnDisputa) => (d.agente.severidad === "alta" ? 1 : 0);
    return s(b) - s(a) || b.congeladoSeg - a.congeladoSeg;
  });
  const g = orden[0];
  return {
    orden: orden.map((d) => d.agente.id),
    motivo: `${g.agente.nombre} tiene prioridad por severidad ${g.agente.severidad} y lleva ${g.congeladoSeg}s esperando.`,
    porModelo: false,
  };
}

const SISTEMA = `Eres el árbitro de una tesorería. Varias operaciones están congeladas
esperando una firma humana y hay menos personas libres que operaciones.

Decides el ORDEN DE LA COLA, nunca si una operación se aprueba. No puedes autorizar
dinero: solo repartir la atención de las personas disponibles.

Devuelves únicamente un JSON, sin texto alrededor, con esta forma exacta:
{"orden":["id","id"],"motivo":"una frase"}

El motivo va en español, en menos de 130 caracteres, y explica el criterio real que
usaste. Si cedes el turno a la operación de menor monto, di por qué. Nada de frases
genéricas ni de repetir los datos que ya están en pantalla.

En el motivo NUNCA escribas los identificadores (ag_fx, refund, ag_payroll). Usa el
nombre de la operación tal como lo ve el usuario: "la cobertura cambiaria", "el
reembolso masivo". Los ids solo van en el campo "orden".`;

/**
 * Reparte la atención disponible entre los agentes que la están pidiendo.
 *
 * Una sola llamada por evento de contención, nunca una por agente. Si el modelo falla
 * o tarda, cae a la regla determinista sin que la pantalla se entere: un modelo caído
 * no puede congelar el tablero.
 */
export async function arbitrar(
  disputa: EnDisputa[],
  libres: number
): Promise<Arbitraje> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[aldaba] arbitro: sin ANTHROPIC_API_KEY, cae a regla");
    return porRegla(disputa);
  }
  if (disputa.length < 2) return porRegla(disputa);

  const lineas = disputa
    .map(
      (d) =>
        `- id ${d.agente.id} · ${d.agente.operacion} · ${moneda(d.agente.monto)} · severidad ${d.agente.severidad} · congelada hace ${d.congeladoSeg}s · regla: ${d.agente.regla}`
    )
    .join("\n");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        // Medido, no estimado: con los cinco carriles en disputa la respuesta gasta
        // 257 tokens. Los 220 de antes cortaban el JSON a media frase, la llave de
        // cierre no llegaba nunca y el arbitro caia a la regla el 100% de las veces
        // justo en el caso de contencion para el que existe. Con dos agentes cabia,
        // asi que en las pruebas cortas no se veia.
        max_tokens: 600,
        system: SISTEMA,
        messages: [
          {
            role: "user",
            content: `Personas libres ahora mismo: ${libres}.\nOperaciones pidiendo firma:\n${lineas}\n\n¿En qué orden se reparte la atención?`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!r.ok) {
      console.error("[aldaba] arbitro: HTTP", r.status, await r.text().catch(() => ""));
      return porRegla(disputa);
    }

    const data = (await r.json()) as { content?: { type: string; text?: string }[] };
    const texto = data.content?.find((b) => b.type === "text")?.text ?? "";
    const abre = texto.indexOf("{");
    const cierra = texto.lastIndexOf("}");
    // Un recorte por presupuesto deja el JSON sin llave de cierre. Sin esta guarda,
    // `slice` devolvia cadena vacia y el error que salia por consola era
    // "Unexpected end of JSON input", que apunta al parser y no a la causa.
    if (abre === -1 || cierra < abre) {
      console.error("[aldaba] arbitro: respuesta sin JSON cerrado, largo", texto.length);
      return porRegla(disputa);
    }
    const salida = JSON.parse(texto.slice(abre, cierra + 1)) as {
      orden?: string[];
      motivo?: string;
    };

    const validos = new Set(disputa.map((d) => d.agente.id));
    const orden = (salida.orden ?? []).filter((id) => validos.has(id));
    // Si el modelo se dejó alguno fuera, se completa con el resto en orden de regla.
    for (const id of porRegla(disputa).orden) if (!orden.includes(id)) orden.push(id);

    if (orden.length !== disputa.length || !salida.motivo) {
      console.error("[aldaba] arbitro: respuesta incompleta", JSON.stringify(salida));
      return porRegla(disputa);
    }

    // Un arbitro que siempre cae a la regla parece un arbitro que funciona. El exito
    // tambien deja rastro, o no hay forma de distinguir los dos casos en produccion.
    console.log("[aldaba] arbitro: resuelto por el modelo ·", salida.motivo.slice(0, 90));
    return { orden, motivo: salida.motivo.slice(0, 160), porModelo: true };
  } catch (e) {
    // Sin rastro, un arbitro que siempre cae a la regla parece un arbitro que
    // funciona, y es justo lo contrario.
    console.error("[aldaba] arbitro fallo:", e instanceof Error ? e.message : e);
    return porRegla(disputa);
  }
}
