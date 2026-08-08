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

/**
 * Los aprobadores automaticos. Los humanos NO estan aqui: entran solos.
 *
 * Antes habia un `ap_visitante` fijo y una sala por visitante, asi que dos personas
 * que abrian la URL a la vez eran el mismo usuario en salas distintas y no se veian.
 * Eso apagaba justo lo unico que ninguna otra tecnologia da. Ahora la sala es una,
 * cada navegador trae identidad propia, y la cadena de aprobadores se compone en vivo
 * con quien esta presente.
 */
export const SEMBRADOS: Approver[] = [
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

/** La sala es una sola y publica. Ahi es donde se cruzan los visitantes. */
export const SALA = "sala";

/** Nombres para los visitantes, en orden de llegada. */
const NOMBRES = [
  "Aprobador 1", "Aprobador 2", "Aprobador 3", "Aprobador 4",
  "Aprobador 5", "Aprobador 6", "Aprobador 7", "Aprobador 8",
];

export function nombreDeVisitante(indice: number): string {
  return NOMBRES[indice % NOMBRES.length];
}

export type Severidad = "alta" | "media";

export interface AgenteSpec {
  id: string;
  /**
   * Nombre propio, no una etiqueta funcional.
   *
   * "Agente de pagos" describe un puesto y no se recuerda. Un nombre se recuerda, y
   * en una pantalla donde cinco agentes compiten por la misma persona hace falta
   * poder decir "Kuntur lleva veinte segundos esperando" en vez de "el de pagos".
   *
   * Vienen del quechua y cada uno dice algo de lo que el agente hace. Es una
   * decision de marca deliberada para un producto de tesoreria peruana: nombrarlos
   * Alpha, Beta y Gamma habria sido el default de cualquiera.
   */
  nombre: string;
  /** Lo que hace, en una linea. Va debajo del nombre. */
  oficio: string;
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
  /**
   * Las lineas que ve quien llega tarde y no presencio el razonamiento.
   *
   * Van escritas una por una y no generadas con una plantilla. Una plantilla que
   * dice "la contraparte no tiene historial previo" produce frases sin sentido en
   * cuanto la contraparte son 312 clientes o la mesa de dinero interna, y un jurado
   * del sector financiero lo detecta en la primera lectura.
   */
  resumen: string[];
}

/* Los nombres vienen del quechua y cada uno dice algo del oficio:
 *
 *   Kuntur  condor, el que vigila desde arriba lo que sale
 *   Yaku    agua, lo que devuelve y fluye de vuelta
 *   Rumi    piedra, el limite que no cede
 *   Wayra   viento, lo que cambia de direccion
 *   Ayni    reciprocidad, el trabajo que se devuelve entre iguales
 *
 * Nombrarlos Alpha, Beta y Gamma habria sido el default de cualquiera. */

// Un solo carril corre un LLM real. Los otros cuatro publican trazas guionadas por
// el mismo canal de Portal, con la misma forma de mensaje y el mismo transporte.
// Para quien mira es identico; para la infraestructura cuesta cero y elimina el
// riesgo de topar limites de tasa justo durante la evaluacion. Esto se declara en
// el README.
export const AGENTES: AgenteSpec[] = [
  {
    id: "ag_transfer",
    nombre: "Kuntur",
    oficio: "Pagos a proveedores",
    operacion: "Transferencia a proveedor nuevo",
    monto: { valor: 48_200, moneda: "PEN" },
    contraparte: "Andina Logística SAC",
    regla: "Monto sobre S/ 25 000 hacia contraparte sin historial",
    severidad: "alta",
    plazo: 20,
    enVivo: true,
    bloqueaEn: 6,
    resumen: [
      "Andina Logística SAC no figura en el maestro de contrapartes: es su primera operación con nosotros.",
      "Los datos bancarios coinciden con los del contrato firmado, sin observaciones.",
      "Hay cobertura suficiente en la cuenta de origen.",
      "S/ 48 200 supera el límite que puedo ejecutar sin firma hacia una contraparte nueva.",
    ],
  },
  {
    id: "ag_refund",
    nombre: "Yaku",
    oficio: "Devoluciones y reembolsos",
    operacion: "Reembolso masivo por incidencia",
    monto: { valor: 12_940, moneda: "PEN" },
    contraparte: "312 clientes afectados",
    regla: "Reembolso agregado sobre S/ 10 000 en una sola ejecución",
    severidad: "media",
    plazo: 25,
    enVivo: false,
    bloqueaEn: 3,
    resumen: [
      "La incidencia del 6 de agosto dejó 312 cobros duplicados, todos confirmados contra el log de la pasarela.",
      "Cada reembolso individual está dentro de mi límite; el agregado no.",
      "Los 312 destinos son cuentas ya usadas por esos mismos clientes.",
      "S/ 12 940 en una sola ejecución supera el tope de reembolso agregado.",
    ],
  },
  {
    id: "ag_limit",
    nombre: "Rumi",
    oficio: "Líneas y límites de crédito",
    operacion: "Ampliación de línea de crédito",
    monto: { valor: 150_000, moneda: "PEN" },
    contraparte: "Comercial Huaraz EIRL",
    regla: "Ampliación sobre el 40% de la línea vigente",
    severidad: "alta",
    plazo: 18,
    enVivo: false,
    bloqueaEn: 9,
    resumen: [
      "Comercial Huaraz EIRL tiene 14 meses de historial sin atrasos.",
      "La línea vigente es de S/ 90 000 y la ampliación pedida la lleva a S/ 240 000.",
      "El ratio de endeudamiento resultante queda dentro de política.",
      "El salto es del 167% sobre la línea vigente y el techo que puedo aprobar es 40%.",
    ],
  },
  {
    id: "ag_fx",
    nombre: "Wayra",
    oficio: "Posición cambiaria",
    operacion: "Cobertura cambiaria fuera de banda",
    monto: { valor: 86_500, moneda: "USD" },
    contraparte: "Mesa de dinero",
    regla: "Tipo de cambio fuera de la banda autorizada",
    severidad: "media",
    plazo: 30,
    enVivo: false,
    bloqueaEn: 12,
    resumen: [
      "La posición en dólares queda cubierta al 92% con esta operación.",
      "El tipo de cambio ofrecido es 3.71, y la banda autorizada cierra en 3.68.",
      "La contraparte es la mesa de dinero interna, no un tercero.",
      "Operar fuera de la banda necesita firma, sin importar el monto.",
    ],
  },
  {
    id: "ag_payroll",
    nombre: "Ayni",
    oficio: "Planilla y beneficios",
    operacion: "Pago de planilla fuera de calendario",
    monto: { valor: 233_100, moneda: "PEN" },
    contraparte: "84 colaboradores",
    regla: "Desembolso de planilla fuera de la fecha programada",
    severidad: "alta",
    plazo: 22,
    enVivo: false,
    bloqueaEn: 15,
    resumen: [
      "Los 84 colaboradores y sus montos coinciden con la planilla aprobada del mes.",
      "El desembolso está programado para el día 30 y hoy es 8.",
      "El área de personal pidió el adelanto por el feriado largo.",
      "Adelantar planilla fuera de calendario no está en mis atribuciones.",
    ],
  },
];
