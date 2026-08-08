// El reparto de la demo. Tres aprobadores y cinco agentes.
//
// Quien abre la URL recibe la identidad de `visitante` y entra como aprobador de
// turno. Los otros dos aprobadores son presencias sembradas con comportamiento
// declarado: se muestran como participantes automaticos, nunca disfrazados de
// personas. Un jurado que descubre un actor disfrazado castiga mas que uno que ve
// un actor honesto.

export type ApproverKind = "visitante" | "sembrado";

export interface Approver {
  id: string;
  nombre: string;
  rol: string;
  kind: ApproverKind;
  /** Solo para sembrados: como se comporta durante el escenario. */
  guion?: {
    /** Segundos desde el arranque en que se conecta. 0 = ya presente. */
    entraEn: number;
    /** Si responde cuando le tocan, y a los cuantos segundos. `null` = nunca. */
    respondeEn: number | null;
  };
}

export const APROBADORES: Approver[] = [
  {
    id: "ap_visitante",
    nombre: "Tú",
    rol: "Aprobador de turno",
    kind: "visitante",
  },
  {
    id: "ap_rivas",
    nombre: "M. Rivas",
    rol: "Riesgo operativo",
    kind: "sembrado",
    // Conectado desde el inicio y no contesta. Es el que demuestra que estar
    // presente no es lo mismo que estar disponible.
    guion: { entraEn: 0, respondeEn: null },
  },
  {
    id: "ap_okada",
    nombre: "L. Okada",
    rol: "Tesorería",
    kind: "sembrado",
    // Entra tarde. Su llegada reordena la cola en vivo, que es el momento en que
    // se ve que la presencia gobierna el enrutamiento.
    guion: { entraEn: 40, respondeEn: 6 },
  },
];

export const VISITANTE = APROBADORES[0];

export type Severidad = "alta" | "media";

export interface AgenteSpec {
  id: string;
  nombre: string;
  /** Que operacion evalua. Aparece en la fila comprimida. */
  operacion: string;
  monto: { valor: number; moneda: string };
  contraparte: string;
  /** La regla que lo detiene. Se muestra en la UI, no vive solo en el codigo. */
  regla: string;
  severidad: Severidad;
  /** Segundos que dura el plazo de cada puerta. */
  plazo: number;
  /** Solo el carril protagonista corre un modelo en vivo. */
  enVivo: boolean;
  /** Segundos desde el arranque en que este agente cruza su umbral. */
  bloqueaEn: number;
}

// Un solo carril corre un LLM real. Los otros cuatro publican trazas guionadas por
// el mismo canal de Portal, con la misma forma de mensaje y el mismo transporte.
// Para quien mira es identico; para la infraestructura cuesta cero y elimina el
// riesgo de topar limites de tasa justo durante la evaluacion. Esto se declara en
// el README.
export const AGENTES: AgenteSpec[] = [
  {
    id: "ag_transfer",
    nombre: "Agente de pagos",
    operacion: "Transferencia a proveedor nuevo",
    monto: { valor: 48_200, moneda: "PEN" },
    contraparte: "Andina Logística SAC",
    regla: "Monto sobre S/ 25 000 hacia contraparte sin historial",
    severidad: "alta",
    plazo: 20,
    enVivo: true,
    bloqueaEn: 6,
  },
  {
    id: "ag_refund",
    nombre: "Agente de reembolsos",
    operacion: "Reembolso masivo por incidencia",
    monto: { valor: 12_940, moneda: "PEN" },
    contraparte: "312 clientes afectados",
    regla: "Reembolso agregado sobre S/ 10 000 en una sola ejecución",
    severidad: "media",
    plazo: 25,
    enVivo: false,
    bloqueaEn: 3,
  },
  {
    id: "ag_limit",
    nombre: "Agente de límites",
    operacion: "Ampliación de línea de crédito",
    monto: { valor: 150_000, moneda: "PEN" },
    contraparte: "Comercial Huaraz EIRL",
    regla: "Ampliación sobre el 40% de la línea vigente",
    severidad: "alta",
    plazo: 18,
    enVivo: false,
    bloqueaEn: 9,
  },
  {
    id: "ag_fx",
    nombre: "Agente de cambio",
    operacion: "Cobertura cambiaria fuera de banda",
    monto: { valor: 86_500, moneda: "USD" },
    contraparte: "Mesa de dinero",
    regla: "Tipo de cambio fuera de la banda autorizada",
    severidad: "media",
    plazo: 30,
    enVivo: false,
    bloqueaEn: 12,
  },
  {
    id: "ag_payroll",
    nombre: "Agente de planilla",
    operacion: "Pago de planilla fuera de calendario",
    monto: { valor: 233_100, moneda: "PEN" },
    contraparte: "84 colaboradores",
    regla: "Desembolso de planilla fuera de la fecha programada",
    severidad: "alta",
    plazo: 22,
    enVivo: false,
    bloqueaEn: 15,
  },
];
