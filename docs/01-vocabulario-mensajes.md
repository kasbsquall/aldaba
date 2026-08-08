# Vocabulario de mensajes

Todos los mensajes de Aldaba viajan por el canal del caso, `aldaba-case-{caseId}`, y
llevan un `type` con prefijo `aldaba.`. El prefijo importa: es lo que el puente `notify`
filtra en `portal.config.ts` y lo que las dos vistas usan para decidir qué renderizar.

Reglas que aplican a todos:

- `content` no puede pasar de 2KB. Los payloads de abajo están dimensionados para eso.
- Los efímeros no sobreviven a un refresh. Solo se usan para lo que no importa perder.
- Los persistentes son los que el jurado ve al abrir la URL con el caso ya empezado.

---

## Tabla resumen

| Tipo | Persistencia | Emisor | Para qué |
| --- | --- | --- | --- |
| `aldaba.task.start` | persistente | agente | Abre el caso y fija el contexto |
| `aldaba.reason` | efímero | agente | Un paso del razonamiento |
| `aldaba.tool` | efímero | agente | Una llamada a herramienta y su resultado |
| `aldaba.threshold` | persistente | agente | Cruzó el umbral de riesgo y se detiene |
| `aldaba.roster` | persistente | orquestador | Foto de quién estaba disponible |
| `aldaba.knock` | persistente, con `to:` | orquestador | Toca una puerta. Dispara el inbox |
| `aldaba.timeout` | persistente | orquestador | Nadie abrió esa puerta |
| `aldaba.verdict` | persistente | aprobador | Aprueba o rechaza |
| `aldaba.resume` | persistente | agente | Retoma la ejecución |
| `aldaba.done` | persistente | agente | Cierra el caso |

Los tres persistentes que cuentan la historia completa son `threshold`, `knock` y
`verdict`. Si solo sobrevivieran esos tres, la vista del observador seguiría siendo
legible. Todo lo demás es enriquecimiento.

---

## Formas

```ts
// Vive en shared/messages.ts, lo importan agente, orquestador y las dos vistas.

export type CaseId = string;
export type ApproverId = string;

/** Abre el caso. Primer mensaje del canal, siempre. */
export interface TaskStart {
  type: "aldaba.task.start";
  caseId: CaseId;
  title: string;              // "Transferencia a proveedor nuevo"
  startedAt: string;          // ISO 8601
}

/** Un paso del razonamiento. Efímero: se pierde al refrescar, y da igual. */
export interface Reason {
  type: "aldaba.reason";
  step: number;
  text: string;               // recortar a ~600 chars antes de enviar
  truncated?: boolean;
}

/** Una llamada a herramienta. Efímero. */
export interface ToolCall {
  type: "aldaba.tool";
  step: number;
  tool: string;               // "ledger.lookup"
  status: "running" | "ok" | "error";
  summary?: string;           // una línea, no el payload entero
}

/** Cruzó el umbral. A partir de aquí el agente está detenido. */
export interface Threshold {
  type: "aldaba.threshold";
  caseId: CaseId;
  rule: string;               // qué regla lo detuvo, en lenguaje humano
  amount?: { value: number; currency: string };
  counterparty?: string;
  rationale: string;          // por qué el agente cree que hay que preguntar
  reasoningDigest: string[];  // 3 a 5 líneas del razonamiento, para el que llega tarde
}

/** Foto de la presencia en el momento de decidir a quién tocar. */
export interface Roster {
  type: "aldaba.roster";
  caseId: CaseId;
  online: ApproverId[];
  offline: ApproverId[];
  order: ApproverId[];        // la cadena resuelta, en el orden en que se va a tocar
  takenAt: string;
}

/** Toca una puerta. El notify lo convierte en item de inbox. */
export interface Knock {
  type: "aldaba.knock";
  caseId: CaseId;
  to: ApproverId;             // también va como `to` del envelope, no solo aquí
  attempt: number;            // 1, 2, 3...
  wasOnline: boolean;         // estaba presente cuando se le tocó
  deadline: string;           // ISO 8601, lo calcula el backend
  summary: string;            // una línea para el título del inbox
}

/** Se agotó el plazo de esa puerta. */
export interface Timeout {
  type: "aldaba.timeout";
  caseId: CaseId;
  approver: ApproverId;
  attempt: number;
  waitedMs: number;
}

/** La decisión. */
export interface Verdict {
  type: "aldaba.verdict";
  caseId: CaseId;
  approver: ApproverId;
  decision: "approve" | "reject";
  note?: string;
  attempt: number;            // en qué puerta se resolvió
  elapsedMs: number;          // desde el threshold hasta aquí
}

/** El agente retoma. */
export interface Resume {
  type: "aldaba.resume";
  caseId: CaseId;
  decision: "approve" | "reject";
  by: ApproverId;
}

/** Fin. */
export interface Done {
  type: "aldaba.done";
  caseId: CaseId;
  outcome: "completed" | "cancelled";
  summary: string;
}

export type AldabaMessage =
  | TaskStart | Reason | ToolCall | Threshold | Roster
  | Knock | Timeout | Verdict | Resume | Done;
```

---

## Por qué cada campo raro está ahí

**`reasoningDigest` en `Threshold`.** El razonamiento va efímero, así que quien abre la
página después del arranque no lo vio. Esas tres a cinco líneas son lo único que le
queda al aprobador para no decidir a ciegas, y decidir a ciegas es exactamente lo que
Aldaba dice que evita. Si se cae este campo, se cae medio pitch.

**`wasOnline` en `Knock`.** Es el campo que hace visible la tesis. Permite que la vista
del observador muestre "se tocó a quien estaba conectado" frente a "se tocó a quien
tocaba por calendario". Sin él, la cadena de escalamiento se ve igual que la de
cualquier otra herramienta.

**`deadline` en vez de `timeoutMs`.** Un instante absoluto se renderiza igual da cuándo
se conecte el cliente. Una duración obliga a saber cuándo empezó a contar, y si el
cliente entró tarde, pinta mal el reloj.

**`attempt` repetido en `Knock`, `Timeout` y `Verdict`.** Deja emparejar los tres sin
depender del orden de llegada ni del `seq`. Con reconexiones y gap-fill de por medio,
apoyarse en el orden es frágil.

**`elapsedMs` en `Verdict`.** Es el número del cierre de la demo: cuánto tardó en
resolverse algo que en un sistema con compuerta humana clásica se habría quedado
congelado. Calcularlo en el backend y no en el cliente, para que no dependa de relojes
locales.

---

## El puente notify

```ts
// portal.config.ts
import { defineConfig, allow, block } from "@portalsdk/config";

export default defineConfig({
  channels: {
    "aldaba-case-*": {
      anonymous: false,
      authz: (ctx) => {
        if (ctx.claims.anon) return block("Inicia sesión para ver este caso.");
        return allow({ publish: true, sendDirect: true });
      },
      notify: (ctx) => {
        if (ctx.message.type !== "aldaba.knock") return null;
        const to = ctx.message.to;
        if (!to) return null;

        const k = ctx.message.content as {
          summary: string; attempt: number; caseId: string; deadline: string;
        };
        return {
          title: `Aprobación requerida: ${k.summary}`,
          data: { caseId: k.caseId, attempt: k.attempt, deadline: k.deadline },
          to: [to],
        };
      },
    },
  },
});
```

Detalles que ya costaron lectura:

- `anonymous: false` es obligatorio, no cosmético. El inbox rechaza tokens anónimos con
  `403 anonymous_not_allowed`, así que un anónimo en el canal nunca podría recibir un
  knock y se quedaría esperando sin señal de error clara.
- El canal no lleva membresía a propósito. Ver la decisión D6.
- `notify` devuelve `null` para todo lo que no sea un knock, o cada paso del agente
  acabaría en el inbox de alguien.
- Tras cada `portal deploy`, reconectar los clientes. Las conexiones vivas se quedan con
  la configuración anterior.

---

## Canales

| Canal | Para qué |
| --- | --- |
| `aldaba-case-{caseId}` | Todo el ciclo de un caso. Es el que abren las dos vistas |

Un solo patrón de canal. Si más adelante hace falta un tablero con varios casos a la
vez, se resuelve con un canal `aldaba-board` en modo `broadcast`, pero no entra en el
alcance del fin de semana.
