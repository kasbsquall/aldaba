// Vocabulario de mensajes de Aldaba sobre Portal.
//
// Portal no tiene primitiva de ejecuciones de agente: la palabra "agent" no aparece
// en su documentacion. El streaming del razonamiento son mensajes de canal con
// tipos propios bajo el prefijo `aldaba.`, que es lo que el puente `notify` filtra.
//
// Dos reglas gobiernan todo lo de abajo:
//
// 1. `content` no puede pasar de 2KB. Los payloads estan dimensionados para eso y
//    el razonamiento se trocea antes de enviarse.
// 2. Lo efimero no sobrevive a un refresh. El jurado va a abrir la URL con el caso
//    ya corriendo, o va a recargar. Todo lo que la pantalla necesita para contar la
//    historia va persistente; solo el ruido de fondo va efimero.

export const CANAL_PREFIJO = "aldaba-case-";
export const canalDeCaso = (caseId: string) => `${CANAL_PREFIJO}${caseId}`;

/** Portal corta en 2KB. Dejamos margen para el envelope. */
export const LIMITE_CONTENIDO = 1_600;

export type CaseId = string;
export type AgenteId = string;
export type AprobadorId = string;

export type TipoMensaje =
  | "aldaba.escenario"
  | "aldaba.reason"
  | "aldaba.tool"
  | "aldaba.threshold"
  | "aldaba.roster"
  | "aldaba.knock"
  | "aldaba.timeout"
  | "aldaba.verdict"
  | "aldaba.resume"
  | "aldaba.done"
  | "aldaba.handoff"
  | "aldaba.arbitraje";

/** Abre el escenario. Primer mensaje persistente del canal, siempre. */
export interface Escenario {
  caseId: CaseId;
  iniciadoEn: string;
  agentes: { id: AgenteId; nombre: string; oficio?: string; operacion: string }[];
  aprobadores: { id: AprobadorId; nombre: string; rol: string; sembrado: boolean }[];
}

/** Un paso del razonamiento. Efimero: se pierde al refrescar y da igual. */
export interface Reason {
  agente: AgenteId;
  paso: number;
  texto: string;
  truncado?: boolean;
}

/** Una llamada a herramienta. Efimero. */
export interface ToolCall {
  agente: AgenteId;
  paso: number;
  herramienta: string;
  estado: "corriendo" | "ok" | "error";
  resumen?: string;
}

/** El agente cruzo el umbral. A partir de aqui esta detenido. */
export interface Threshold {
  caseId: CaseId;
  agente: AgenteId;
  regla: string;
  monto: { valor: number; moneda: string };
  contraparte: string;
  /**
   * Tres a cinco lineas del razonamiento. El razonamiento va efimero, asi que quien
   * abre la pagina despues del arranque no lo vio. Esto es lo unico que le queda al
   * aprobador para no decidir a ciegas, y decidir a ciegas es exactamente lo que
   * Aldaba dice que evita.
   */
  resumenRazonamiento: string[];
}

/** Foto de la presencia en el momento de decidir a quien tocar. */
export interface Roster {
  caseId: CaseId;
  agente: AgenteId;
  conectados: AprobadorId[];
  ausentes: AprobadorId[];
  /** La cadena resuelta, en el orden en que se va a tocar. */
  orden: AprobadorId[];
  tomadaEn: string;
}

/** Toca una puerta. El puente `notify` lo convierte en item de inbox. */
export interface Knock {
  caseId: CaseId;
  agente: AgenteId;
  /** Tambien viaja como `to` del envelope, no solo aqui. */
  to: AprobadorId;
  intento: number;
  /**
   * Si esa persona estaba presente cuando se le toco. Es el campo que hace visible
   * la tesis: permite mostrar "se toco a quien estaba conectado" frente a "se toco a
   * quien tocaba por calendario". Sin el, la cadena se ve igual que la de cualquier
   * otra herramienta.
   */
  estabaConectado: boolean;
  /**
   * Instante absoluto, no duracion. Se renderiza igual da cuando se conecte el
   * cliente; una duracion obligaria a saber cuando empezo a contar.
   */
  deadline: string;
  resumen: string;
}

/** Se agoto el plazo de esa puerta. */
export interface Timeout {
  caseId: CaseId;
  agente: AgenteId;
  aprobador: AprobadorId;
  intento: number;
  esperadoMs: number;
}

/** La decision. */
export interface Verdict {
  caseId: CaseId;
  agente: AgenteId;
  aprobador: AprobadorId;
  decision: "aprobado" | "rechazado";
  nota?: string;
  intento: number;
  /** Desde el threshold hasta aqui. Se calcula en el backend, no con relojes locales. */
  transcurridoMs: number;
}

/**
 * Cuando se agota la cadena humana, los agentes negocian la COLA en publico, nunca
 * la operacion. Uno cede su turno, otro baja su peticion y se reencola.
 *
 * La distincion no es cosmetica. Si la maquina pudiera resolver la operacion, toda
 * la cadena de escalamiento seria decoracion: el producto se justifica en que la
 * decision humana llega rapido, y una salida que no necesita humano vacia la
 * premisa. Aqui la maquina decide el orden de la fila, no el dinero.
 */
export interface Handoff {
  caseId: CaseId;
  de: AgenteId;
  a: AgenteId;
  motivo: string;
  /** La regla que invoca para ceder. Visible en la UI, no solo en el codigo. */
  regla: string;
}

/** El agente retoma. */
export interface Resume {
  caseId: CaseId;
  agente: AgenteId;
  decision: "aprobado" | "rechazado";
  por: AprobadorId;
}

/** Fin. */
export interface Done {
  caseId: CaseId;
  agente: AgenteId;
  desenlace: "completado" | "cancelado" | "retenido";
  resumen: string;
}

/**
 * El arbitro repartio la atencion escasa entre varios agentes.
 *
 * Es el unico mensaje del protocolo cuyo contenido lo escribe un modelo. Decide el
 * orden de la cola, nunca la operacion.
 */
export interface Arbitraje {
  caseId: CaseId;
  /** Ids de agente, del que se lleva la persona al que espera mas. */
  orden: AgenteId[];
  motivo: string;
  /** Cuantas personas libres habia cuando se decidio. */
  libres: number;
  /** `false` cuando el modelo fallo y resolvio la regla de respaldo. */
  porModelo: boolean;
}

export type ContenidoPorTipo = {
  "aldaba.escenario": Escenario;
  "aldaba.reason": Reason;
  "aldaba.tool": ToolCall;
  "aldaba.threshold": Threshold;
  "aldaba.roster": Roster;
  "aldaba.knock": Knock;
  "aldaba.timeout": Timeout;
  "aldaba.verdict": Verdict;
  "aldaba.resume": Resume;
  "aldaba.done": Done;
  "aldaba.handoff": Handoff;
  "aldaba.arbitraje": Arbitraje;
};

export type MensajeAldaba = {
  [T in TipoMensaje]: { type: T; content: ContenidoPorTipo[T] };
}[TipoMensaje];

/**
 * Los tipos que sobreviven a un refresh.
 *
 * Estan todos, y no por descuido. El diseno original mandaba el razonamiento como
 * efimero, pero al probarlo contra Portal resulto que los mensajes efimeros no se
 * entregan: `send({ ephemeral: true })` resuelve sin error y ningun otro cliente del
 * canal los recibe. Verificado en un canal con nuestra configuracion y en otro sin
 * ninguna, con el mismo resultado, asi que no es el `authz` ni el prefijo del tipo.
 *
 * El cambio termina jugando a favor. El jurado va a abrir la URL con la sala ya
 * corriendo, y con el razonamiento persistente tambien recibe lo que se penso antes
 * de que llegara, en vez de una pantalla que arranca a medias.
 */
export const TIPOS_PERSISTENTES: ReadonlySet<TipoMensaje> = new Set<TipoMensaje>([
  "aldaba.escenario",
  "aldaba.reason",
  "aldaba.tool",
  "aldaba.threshold",
  "aldaba.roster",
  "aldaba.knock",
  "aldaba.timeout",
  "aldaba.verdict",
  "aldaba.resume",
  "aldaba.done",
  "aldaba.handoff",
  "aldaba.arbitraje",
]);

export const esPersistente = (tipo: TipoMensaje) => TIPOS_PERSISTENTES.has(tipo);

/** Recorta al limite de Portal marcando el truncado en el propio payload. */
export function recortar(texto: string): { texto: string; truncado: boolean } {
  if (texto.length <= LIMITE_CONTENIDO) return { texto, truncado: false };
  return { texto: `${texto.slice(0, LIMITE_CONTENIDO - 1)}…`, truncado: true };
}
