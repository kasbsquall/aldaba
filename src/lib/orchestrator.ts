import { SalaServidor } from "./portal-server";
import { altaDeMiembros } from "./portal-admin";
import { ActorSembrado } from "./seeded";
import { APROBADORES, AGENTES, type AgenteSpec } from "./cast";
import { canalDeCaso, type MensajeAldaba } from "./protocol";

// El orquestador de Aldaba.
//
// Cinco agentes trabajan en paralelo, cada uno llega a su propia decision
// bloqueante, y los cinco compiten por las dos o tres personas conectadas. La
// presencia de Portal decide a quien se le toca la puerta; la contencion decide que
// nadie atienda dos cosas a la vez. De ahi sale la tesis: la atencion humana es el
// recurso escaso y hoy nadie la administra.
//
// Los plazos viven aqui, en el servidor, y no en el cliente. Si vivieran en el
// cliente, cerrar la pestana detendria el escalamiento, y que el agente siga tocando
// puertas aunque nadie mire es justo lo que el producto afirma.

export type EstadoCarril =
  | "trabajando"
  | "bloqueado"
  | "tocando"
  | "aprobado"
  | "rechazado"
  | "retenido";

interface Carril {
  spec: AgenteSpec;
  estado: EstadoCarril;
  intento: number;
  /** A quien se le esta tocando ahora. */
  aprobador: string | null;
  /** Instante absoluto de vencimiento, en epoch ms. */
  deadline: number | null;
  /** Aprobadores ya tocados en este carril, para no repetir puerta. */
  tocados: Set<string>;
  bloqueadoEn: number | null;
  temporizador: ReturnType<typeof setTimeout> | null;
}

export class Sesion {
  readonly canalId: string;
  private sala: SalaServidor;
  private carriles = new Map<string, Carril>();
  /** Quien esta atendiendo que carril. Una persona, un carril. */
  private ocupados = new Map<string, string>();
  private actores: ActorSembrado[] = [];
  private temporizadores: ReturnType<typeof setTimeout>[] = [];
  private arrancadaEn = 0;
  private viva = false;

  constructor(readonly sesionId: string) {
    this.canalId = canalDeCaso(sesionId);
    this.sala = new SalaServidor(this.canalId);
  }

  async arrancar(): Promise<void> {
    if (this.viva) return;
    this.viva = true;
    this.arrancadaEn = Date.now();

    // Sin esto, tocar la puerta falla con `not_member`: un envio dirigido exige que
    // el destinatario sea miembro, y el aprobador solo escucha su inbox.
    await altaDeMiembros(
      this.canalId,
      APROBADORES.map((a) => a.id)
    );

    await this.sala.conectar();

    for (const spec of AGENTES) {
      this.carriles.set(spec.id, {
        spec,
        estado: "trabajando",
        intento: 0,
        aprobador: null,
        deadline: null,
        tocados: new Set(),
        bloqueadoEn: null,
        temporizador: null,
      });
    }

    await this.publicar({
      type: "aldaba.escenario",
      content: {
        caseId: this.sesionId,
        iniciadoEn: new Date(this.arrancadaEn).toISOString(),
        agentes: AGENTES.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          operacion: a.operacion,
        })),
        aprobadores: APROBADORES.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          rol: a.rol,
          sembrado: a.kind === "sembrado",
        })),
      },
    });

    // Los aprobadores sembrados abren su propia conexion con su propia identidad, asi
    // que la presencia que lee el enrutamiento es real. Lo guionado es su conducta.
    this.actores = APROBADORES.filter((a) => a.guion).map(
      (a) =>
        new ActorSembrado(a, this.canalId, (agente, aprobador, decision) =>
          this.resolver(agente, aprobador, decision)
        )
    );
    this.actores.forEach((a) => a.planificar());

    // Cada agente cruza su umbral en su propio momento. Escalonarlos es lo que hace
    // que el tablero tenga tension desde el segundo cero en vez de encenderse de golpe.
    for (const spec of AGENTES) {
      this.programar(() => void this.bloquear(spec.id), spec.bloqueaEn * 1000);
    }
  }

  /** Un agente cruzo su umbral y se detiene. */
  private async bloquear(agenteId: string): Promise<void> {
    const carril = this.carriles.get(agenteId);
    if (!carril || carril.estado !== "trabajando" || !this.viva) return;

    carril.estado = "bloqueado";
    carril.bloqueadoEn = Date.now();
    const { spec } = carril;

    await this.publicar({
      type: "aldaba.threshold",
      content: {
        caseId: this.sesionId,
        agente: spec.id,
        regla: spec.regla,
        monto: spec.monto,
        contraparte: spec.contraparte,
        // El razonamiento va efimero, asi que quien abre la pagina despues del
        // arranque no lo vio. Estas lineas son lo unico que le queda al aprobador
        // para no decidir a ciegas, que es exactamente lo que Aldaba dice evitar.
        resumenRazonamiento: resumenDe(spec),
      },
    });

    await this.tocarSiguiente(agenteId);
  }

  /**
   * Ordena la cadena por disponibilidad real y toca la siguiente puerta.
   *
   * El orden no es el del organigrama: primero quien esta conectado y libre, luego
   * quien esta conectado pero ocupado, y al final quien no esta. Esa reordenacion es
   * lo que ninguna herramienta del mercado hace, porque ninguna sabe quien esta ahi.
   */
  private async tocarSiguiente(agenteId: string): Promise<void> {
    const carril = this.carriles.get(agenteId);
    if (!carril || !this.viva) return;

    this.liberar(agenteId);

    const { conectados } = this.sala.presencia();
    const enLinea = new Set(conectados);

    // Conectado y libre vale 2, conectado pero ocupado 1, ausente 0. El primero de
    // esa lista es la puerta que se toca, y la lista entera se publica para que la
    // pantalla pueda mostrar por que se eligio a esa persona y no a otra.
    const rango = (id: string) =>
      enLinea.has(id) ? (this.ocupados.has(id) ? 1 : 2) : 0;

    const candidatos = APROBADORES.filter((a) => !carril.tocados.has(a.id)).sort(
      (a, b) => rango(b.id) - rango(a.id)
    );
    const elegido = candidatos[0];

    await this.publicar({
      type: "aldaba.roster",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        conectados: APROBADORES.filter((a) => enLinea.has(a.id)).map((a) => a.id),
        ausentes: APROBADORES.filter((a) => !enLinea.has(a.id)).map((a) => a.id),
        orden: candidatos.map((a) => a.id),
        tomadaEn: new Date().toISOString(),
      },
    });

    if (!elegido) {
      // Se acabaron las puertas humanas. Los agentes negocian la COLA, nunca la
      // operacion: si la maquina pudiera resolver el monto, toda esta cadena seria
      // decoracion y el producto se quedaria sin premisa.
      await this.cederTurno(agenteId);
      return;
    }

    carril.estado = "tocando";
    carril.intento += 1;
    carril.aprobador = elegido.id;
    carril.tocados.add(elegido.id);
    carril.deadline = Date.now() + carril.spec.plazo * 1000;
    this.ocupados.set(elegido.id, agenteId);

    // El toque va PUBLICO al canal, sin `to` en el envelope. Un dirigido solo se
    // entrega a su destinatario, y entonces el tablero no veria los toques a las
    // demas personas: la cadena de escalamiento, que es lo que hay que mostrar,
    // quedaria invisible. El destinatario viaja en el contenido y el puente `notify`
    // lo lee de ahi para mandar la notificacion a una sola persona.
    await this.publicar({
      type: "aldaba.knock",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        to: elegido.id,
        intento: carril.intento,
        // El campo que hace visible la tesis: permite mostrar "se toco a quien
        // estaba conectado" frente a "se toco a quien tocaba por calendario".
        estabaConectado: enLinea.has(elegido.id),
        deadline: new Date(carril.deadline).toISOString(),
        resumen: `${carril.spec.operacion} · ${moneda(carril.spec.monto)}`,
      },
    });

    if (carril.temporizador) clearTimeout(carril.temporizador);
    carril.temporizador = setTimeout(
      () => void this.vencer(agenteId, carril.intento),
      carril.spec.plazo * 1000
    );
  }

  /** Se agoto el plazo de esa puerta. */
  private async vencer(agenteId: string, intento: number): Promise<void> {
    const carril = this.carriles.get(agenteId);
    if (!carril || !this.viva) return;
    // Un veredicto que llego justo a tiempo ya movio el intento: no vencemos nada.
    if (carril.estado !== "tocando" || carril.intento !== intento) return;

    const aprobador = carril.aprobador!;
    await this.publicar({
      type: "aldaba.timeout",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        aprobador,
        intento,
        esperadoMs: carril.spec.plazo * 1000,
      },
    });

    await this.tocarSiguiente(agenteId);
  }

  /** La cadena humana se agoto. Un agente cede su turno en publico. */
  private async cederTurno(agenteId: string): Promise<void> {
    const carril = this.carriles.get(agenteId);
    if (!carril) return;

    const enEspera = [...this.carriles.values()].find(
      (c) => c.spec.id !== agenteId && c.estado === "tocando"
    );

    carril.estado = "retenido";
    this.liberar(agenteId);

    await this.publicar({
      type: "aldaba.handoff",
      content: {
        caseId: this.sesionId,
        de: agenteId,
        a: enEspera?.spec.id ?? agenteId,
        motivo: enEspera
          ? `Sin aprobador disponible. Cedo la cola a ${enEspera.spec.nombre}, que tiene mayor severidad en espera.`
          : "Sin aprobador disponible. La operación queda retenida hasta que alguien abra.",
        regla: "Un agente no puede aprobar su propia operación. Solo puede retener, ceder o reducir el alcance.",
      },
    });

    await this.publicar({
      type: "aldaba.done",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        desenlace: "retenido",
        resumen: "Nadie abrió. La operación no se ejecutó y queda en el acta.",
      },
    });
  }

  /** Llega una decision humana. */
  async resolver(
    agenteId: string,
    aprobadorId: string,
    decision: "aprobado" | "rechazado",
    nota?: string
  ): Promise<{ ok: boolean; motivo?: string }> {
    const carril = this.carriles.get(agenteId);
    if (!carril) return { ok: false, motivo: "carril_desconocido" };
    if (carril.estado !== "tocando") return { ok: false, motivo: "carril_no_esta_esperando" };
    if (carril.aprobador !== aprobadorId) return { ok: false, motivo: "no_es_tu_turno" };

    if (carril.temporizador) clearTimeout(carril.temporizador);
    carril.temporizador = null;
    carril.estado = decision;
    this.liberar(agenteId);

    await this.publicar({
      type: "aldaba.verdict",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        aprobador: aprobadorId,
        decision,
        nota,
        intento: carril.intento,
        // Se calcula aqui y no en el cliente, para que no dependa de relojes locales.
        transcurridoMs: Date.now() - (carril.bloqueadoEn ?? Date.now()),
      },
    });

    await this.publicar({
      type: "aldaba.resume",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        decision,
        por: aprobadorId,
      },
    });

    await this.publicar({
      type: "aldaba.done",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        desenlace: decision === "aprobado" ? "completado" : "cancelado",
        resumen:
          decision === "aprobado"
            ? `${carril.spec.operacion} ejecutada tras la firma de ${aprobadorId}.`
            : `${carril.spec.operacion} cancelada por decisión de ${aprobadorId}.`,
      },
    });

    return { ok: true };
  }

  private liberar(agenteId: string) {
    for (const [persona, carril] of this.ocupados) {
      if (carril === agenteId) this.ocupados.delete(persona);
    }
  }

  private programar(fn: () => void, ms: number) {
    this.temporizadores.push(setTimeout(fn, ms));
  }

  private publicar(mensaje: MensajeAldaba, para?: string) {
    return this.sala.publicar(mensaje, para);
  }

  detener(): void {
    this.viva = false;
    this.actores.forEach((a) => a.detener());
    this.actores = [];
    this.temporizadores.forEach(clearTimeout);
    this.temporizadores = [];
    for (const c of this.carriles.values()) {
      if (c.temporizador) clearTimeout(c.temporizador);
    }
    this.sala.cerrar();
  }
}

function moneda(m: { valor: number; moneda: string }) {
  const simbolo = m.moneda === "USD" ? "US$" : "S/";
  return `${simbolo} ${m.valor.toLocaleString("es-PE")}`;
}

function resumenDe(spec: AgenteSpec): string[] {
  return [
    `Validé la operación contra el maestro de contrapartes y ${spec.contraparte} no tiene historial previo.`,
    `El monto ${moneda(spec.monto)} supera el límite que puedo ejecutar sin firma.`,
    `Regla que me detiene: ${spec.regla}.`,
    `Los datos del beneficiario coinciden con los del contrato, sin observaciones.`,
  ];
}

// Un proceso, una sesion viva. Next corriendo como proceso largo mantiene esto en
// memoria y permite temporizadores reales. El `deadline` viaja como instante
// absoluto en cada toque, asi que si algun dia esto corre en serverless el
// vencimiento se puede evaluar de forma perezosa sin cambiar el protocolo.
const sesiones = new Map<string, Sesion>();

export async function sesionDe(sesionId: string): Promise<Sesion> {
  let s = sesiones.get(sesionId);
  if (!s) {
    s = new Sesion(sesionId);
    sesiones.set(sesionId, s);
    await s.arrancar();
  }
  return s;
}

export function reiniciar(sesionId: string): void {
  sesiones.get(sesionId)?.detener();
  sesiones.delete(sesionId);
}
