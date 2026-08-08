import { SalaServidor } from "./portal-server";
import { altaDeMiembros } from "./portal-admin";
import { ActorSembrado } from "./seeded";
import { SEMBRADOS, AGENTES, type AgenteSpec } from "./cast";
import { canalDeCaso, type MensajeAldaba } from "./protocol";
import { trazaDe } from "./reasoning";
import { arbitrar, type EnDisputa } from "./arbitro";

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
  /** La cadena completa, en orden, para poder reconstruirla en la foto. */
  cadena: { aprobador: string; estabaConectado: boolean; vencio: boolean }[];
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
  /** Quien ya es miembro del canal, para no repetir el alta en cada toque. */
  private dadosDeAlta = new Set<string>();
  /** Evita llamar al arbitro en cada toque durante el mismo episodio. */
  private arbitrando = false;
  /** Cuantos relevos lleva la sala. Alimenta la variacion de las operaciones. */
  private vueltas = 0;
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
      SEMBRADOS.map((a) => a.id)
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
        cadena: [],
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
          oficio: a.oficio,
          operacion: a.operacion,
        })),
        aprobadores: SEMBRADOS.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          rol: a.rol,
          sembrado: true,
        })),
      },
    });

    // Los aprobadores sembrados abren su propia conexion con su propia identidad, asi
    // que la presencia que lee el enrutamiento es real. Lo guionado es su conducta.
    this.actores = SEMBRADOS.filter((a) => a.guion).map(
      (a) =>
        new ActorSembrado(a, this.canalId, (agente, aprobador, decision) =>
          this.resolver(agente, aprobador, decision)
        )
    );
    this.actores.forEach((a) => a.planificar());

    // Cada agente razona en voz alta y cruza su umbral en su propio momento.
    // Escalonarlos es lo que hace que el tablero tenga tension desde el segundo cero
    // en vez de encenderse de golpe.
    for (const spec of AGENTES) {
      void this.razonarHastaBloquear(spec);
    }

    this.vigilar();
  }

  /**
   * Vigila que la sala no se quede congelada.
   *
   * Un carril bloqueado sin plazo y sin nadie a quien tocar se queda ahi para
   * siempre, y el visitante que llega despues encuentra un tablero muerto sin forma
   * de saber que existe un boton de reinicio. Cada 20 segundos, cualquier carril
   * atascado se relanza.
   */
  private vigilar(): void {
    const reloj = setInterval(() => {
      if (!this.viva) return clearInterval(reloj);
      const ahora = Date.now();

      for (const c of this.carriles.values()) {
        const vencido = c.deadline != null && c.deadline < ahora - 4000;
        const varado =
          (c.estado === "bloqueado" || c.estado === "tocando") &&
          (c.deadline == null || vencido) &&
          c.bloqueadoEn != null &&
          ahora - c.bloqueadoEn > 45_000;

        if (varado) void this.tocarSiguiente(c.spec.id);
      }
    }, 20_000);
    this.temporizadores.push(reloj as unknown as ReturnType<typeof setTimeout>);
  }

  /**
   * El agente piensa en voz alta y, al final de su traza, se topa con el umbral.
   *
   * El razonamiento va efimero: es ruido de fondo que no tiene que sobrevivir a un
   * refresh. Lo que si sobrevive es el resumen que viaja en el threshold.
   */
  private async razonarHastaBloquear(spec: AgenteSpec): Promise<void> {
    const pasos = await trazaDe(spec);

    // Reparte la traza dentro de la ventana que este agente tiene antes de bloquear,
    // para que los cinco carriles no se enciendan a la vez ni terminen todos juntos.
    const ventana = spec.bloqueaEn * 1000;
    const total = pasos.reduce((s, p) => s + p.pausa, 0) || 1;
    const escala = ventana / total;

    let acumulado = 0;
    pasos.forEach((paso, i) => {
      acumulado += paso.pausa * escala;
      this.programar(() => {
        if (!this.viva) return;
        this.publicarSuelto({
          type: "aldaba.reason",
          content: { agente: spec.id, paso: i + 1, texto: paso.texto },
        });
        if (paso.herramienta) {
          this.publicarSuelto({
            type: "aldaba.tool",
            content: {
              agente: spec.id,
              paso: i + 1,
              herramienta: paso.herramienta.nombre,
              estado: "ok",
              resumen: paso.herramienta.resumen,
            },
          });
        }
      }, acumulado);
    });

    this.programar(() => void this.bloquear(spec.id), ventana);
  }

  /**
   * Un carril que cierra vuelve a arrancar con una operacion nueva.
   *
   * Sin esto la sala se muere: el primero que abre la URL ve el escenario entero y
   * cualquiera que llegue despues encuentra cinco lineas grises que dicen "no abrio"
   * y nada que hacer. Con cuatro jurados abriendo el enlace cuando les da la gana, y
   * una sola sala compartida, eso es la diferencia entre un producto vivo y una foto.
   *
   * El relevo no es el mismo caso otra vez: cambia el monto, la contraparte y el
   * plazo, para que dos vueltas seguidas no se lean como un bucle.
   */
  private programarRelevo(agenteId: string): void {
    if (!this.viva) return;
    this.programar(() => void this.relevar(agenteId), PAUSA_RELEVO);
  }

  private async relevar(agenteId: string): Promise<void> {
    const carril = this.carriles.get(agenteId);
    if (!carril || !this.viva) return;

    const spec = variar(carril.spec, ++this.vueltas);

    this.carriles.set(agenteId, {
      spec,
      estado: "trabajando",
      intento: 0,
      aprobador: null,
      deadline: null,
      tocados: new Set(),
      cadena: [],
      bloqueadoEn: null,
      temporizador: null,
    });

    // El tablero tiene que enterarse de que este carril es otra operacion, no la
    // anterior revivida.
    await this.publicar({
      type: "aldaba.escenario",
      content: {
        caseId: this.sesionId,
        iniciadoEn: new Date().toISOString(),
        agentes: [...this.carriles.values()].map((c) => ({
          id: c.spec.id,
          nombre: c.spec.nombre,
          oficio: c.spec.oficio,
          operacion: c.spec.operacion,
        })),
        aprobadores: SEMBRADOS.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          rol: a.rol,
          sembrado: true,
        })),
      },
    });

    void this.razonarHastaBloquear(spec);
  }

  /** Sembrados mas los humanos presentes, sin duplicados y con los vivos primero. */
  private cadenaDeAprobadores(
    participantes: { id: string; nombre: string; ocupado: boolean }[]
  ): { id: string; nombre: string }[] {
    const vistos = new Set<string>();
    const salida: { id: string; nombre: string }[] = [];
    for (const p of participantes) {
      if (vistos.has(p.id) || p.id === "orq_aldaba") continue;
      vistos.add(p.id);
      salida.push({ id: p.id, nombre: p.nombre });
    }
    for (const sem of SEMBRADOS) {
      if (vistos.has(sem.id)) continue;
      vistos.add(sem.id);
      salida.push({ id: sem.id, nombre: sem.nombre });
    }
    return salida;
  }

  /** El roster que ve la pantalla. */
  rosterVivo() {
    const { participantes } = this.sala.presencia();
    const porId = new Map(participantes.map((p) => [p.id, p]));
    return this.cadenaDeAprobadores(participantes).map((a) => {
      const vivo = porId.get(a.id);
      const sem = SEMBRADOS.find((x) => x.id === a.id);
      return {
        id: a.id,
        nombre: a.nombre,
        rol: sem?.rol ?? "Aprobador de turno",
        sembrado: Boolean(sem),
        conectado: Boolean(vivo),
        ocupado: Boolean(vivo?.ocupado),
        atendiendo: this.ocupados.get(a.id) ?? null,
      };
    });
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

    const { participantes } = this.sala.presencia();
    const enLinea = new Map(participantes.map((p) => [p.id, p]));

    // La cadena no es una lista fija: son los sembrados mas quien haya entrado por su
    // cuenta. Un humano que abre la URL aparece aqui sin que nadie lo de de alta.
    const cadena = this.cadenaDeAprobadores(participantes);

    // Libre 3, ocupado atendiendo otro carril 2, ocupado por decision propia 1,
    // ausente 0.
    //
    // Que alguien se declare ocupado pese mas que estar ausente es deliberado: sigue
    // ahi y puede cambiar de idea. Pero pesa menos que estar ocupado por el sistema,
    // porque lo que la persona declara sobre si misma manda sobre lo que el sistema
    // infiere. Esa distincion entre presencia y disponibilidad es todo el producto.
    const rango = (id: string) => {
      const p = enLinea.get(id);
      if (!p) return 0;
      if (p.ocupado) return 1;
      return this.ocupados.has(id) ? 2 : 3;
    };

    // Quien ya esta atendiendo otro carril queda fuera, sin excepcion.
    //
    // Antes era una preferencia de orden, asi que un ocupado siempre ganaba a un
    // ausente y se le volvia a tocar: tres filas decian "tocando a la misma persona"
    // y solo una era accionable. Una persona atiende una cosa a la vez, y si eso
    // deja al carril sin nadie, espera. Esperar es honesto; repartir la misma
    // persona entre tres puertas contradice la premisa del producto.
    const candidatos = cadena
      .filter((a) => !carril.tocados.has(a.id) && !this.ocupados.has(a.id))
      .sort((a, b) => rango(b.id) - rango(a.id));
    const elegido = candidatos[0] ?? null;

    // Contencion real: mas carriles pidiendo firma que personas libres. Ahi no hay
    // respuesta anticipable y decide el arbitro, una sola vez por episodio.
    const libres = cadena.filter((a) => rango(a.id) === 3).length;
    const pidiendo = [...this.carriles.values()].filter(
      (c) => c.estado === "bloqueado" || c.estado === "tocando"
    );
    if (pidiendo.length > libres && libres >= 1 && !this.arbitrando) {
      this.arbitrando = true;
      const ahora = Date.now();
      const disputa: EnDisputa[] = pidiendo.map((c) => ({
        agente: c.spec,
        congeladoSeg: Math.round((ahora - (c.bloqueadoEn ?? ahora)) / 1000),
      }));
      void arbitrar(disputa, libres)
        .then((a) =>
          this.publicar({
            type: "aldaba.arbitraje",
            content: {
              caseId: this.sesionId,
              orden: a.orden,
              motivo: a.motivo,
              libres,
              porModelo: a.porModelo,
            },
          })
        )
        .catch(() => {})
        .finally(() => {
          // Un episodio de arbitraje por ventana, para no llamar al modelo en cada toque.
          setTimeout(() => (this.arbitrando = false), 12_000);
        });
    }

    await this.publicar({
      type: "aldaba.roster",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        conectados: cadena.filter((a) => enLinea.has(a.id)).map((a) => a.id),
        ausentes: cadena.filter((a) => !enLinea.has(a.id)).map((a) => a.id),
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

    // Un humano que acaba de entrar todavia no es miembro del canal, y sin eso el
    // envio dirigido falla con `not_member`. Se da de alta al vuelo, una sola vez.
    if (!this.dadosDeAlta.has(elegido.id)) {
      this.dadosDeAlta.add(elegido.id);
      altaDeMiembros(this.canalId, [elegido.id]).catch((e) =>
        console.error("[aldaba] no se pudo dar de alta a", elegido.id, e)
      );
    }

    carril.estado = "tocando";
    carril.intento += 1;
    carril.aprobador = elegido.id;
    carril.tocados.add(elegido.id);
    carril.cadena.push({
      aprobador: elegido.id,
      estabaConectado: enLinea.has(elegido.id),
      vencio: false,
    });
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
    const ultima = carril.cadena.at(-1);
    if (ultima) ultima.vencio = true;

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

    this.programarRelevo(agenteId);

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

    this.programarRelevo(agenteId);

    await this.publicar({
      type: "aldaba.done",
      content: {
        caseId: this.sesionId,
        agente: agenteId,
        desenlace: decision === "aprobado" ? "completado" : "cancelado",
        // Nombre, nunca el identificador: `ap_visitante` en pantalla delata que
        // nadie reviso el texto que ve el usuario.
        resumen:
          decision === "aprobado"
            ? `${carril.spec.operacion} ejecutada tras la firma de ${nombreDe(aprobadorId)}.`
            : `${carril.spec.operacion} cancelada por decisión de ${nombreDe(aprobadorId)}.`,
      },
    });

    return { ok: true };
  }

  /**
   * Foto del tablero tal como esta ahora.
   *
   * Existe porque en este entorno Portal entrega en vivo pero no persiste: el
   * historial de un canal vuelve siempre vacio, comprobado tambien en un canal sin
   * configuracion alguna. Un cliente que se conecta un segundo despues de que el
   * agente empiece a trabajar se queda sin nada y no hay forma de recuperarlo desde
   * el canal.
   *
   * Asi que el estado vive aqui, que es donde ya vivia, y se entrega al arrancar.
   * El canal sigue siendo el transporte en vivo; deja de ser la fuente de verdad.
   */
  instantanea() {
    return {
      arrancado: true,
      arbitraje: null,
      aprobadores: this.rosterVivo(),
      carriles: [...this.carriles.values()].map((c) => ({
        id: c.spec.id,
        nombre: c.spec.nombre,
        oficio: c.spec.oficio,
        operacion: c.spec.operacion,
        estado:
          c.estado === "trabajando"
            ? ("trabajando" as const)
            : c.estado === "aprobado" || c.estado === "rechazado" || c.estado === "retenido"
              ? (c.estado as "aprobado" | "rechazado" | "retenido")
              : ("esperando" as const),
        razonamiento: [] as string[],
        herramienta: null,
        umbral:
          c.bloqueadoEn == null
            ? null
            : {
                caseId: this.sesionId,
                agente: c.spec.id,
                regla: c.spec.regla,
                monto: c.spec.monto,
                contraparte: c.spec.contraparte,
                resumenRazonamiento: resumenDe(c.spec),
              },
        tocandoA: c.aprobador,
        intento: c.intento,
        deadline: c.deadline,
        cadena: c.cadena.map((p) => ({ ...p })),
        veredicto: null,
        cierre: null,
        cedio: null,
      })),
    };
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

  /**
   * Publica sin bloquear al llamador, pero deja rastro si falla.
   *
   * Un `void promesa` se traga el error y el sintoma aparece mucho despues como
   * "faltan mensajes en la pantalla", que es de lo mas caro de diagnosticar contra
   * reloj.
   */
  private publicarSuelto(mensaje: MensajeAldaba) {
    this.publicar(mensaje).catch((e) => {
      console.error(
        `[aldaba] no se pudo publicar ${mensaje.type}:`,
        e instanceof Error ? e.message : e
      );
    });
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

/** Como aparece un monto escrito dentro de las lineas del resumen. */
function formatoMonto(valor: number): string {
  return valor.toLocaleString("es-PE").replace(/,/g, " ");
}

/** Lo que tarda un carril en volver con otra operacion. */
const PAUSA_RELEVO = 9_000;

/**
 * Devuelve la misma clase de operacion con otros numeros.
 *
 * Repetir el caso identico se lee como un bucle en cuanto alguien mira dos vueltas
 * seguidas. Cambiar monto, contraparte y plazo cuesta nada y hace que la sala se
 * sienta un flujo de trabajo en vez de una animacion.
 */
function variar(spec: AgenteSpec, vuelta: number): AgenteSpec {
  const factor = 0.6 + ((vuelta * 37) % 90) / 100;
  const valor = Math.round((spec.monto.valor * factor) / 100) * 100;

  // El resumen cita cifras concretas, asi que si cambia el monto tiene que cambiar
  // con el. Ya me paso con la contraparte: la cabecera decia un numero y el
  // razonamiento seguia afirmando otro, en el bloque al que un jurado de banca le
  // presta mas atencion. Se reescriben las lineas que mencionan el monto original.
  const antes = formatoMonto(spec.monto.valor);
  const ahora = formatoMonto(valor);
  const resumen = spec.resumen.map((l) => l.split(antes).join(ahora));

  // La contraparte NO cambia, a proposito.
  //
  // Variarla dejaba la cabecera diciendo "203 colaboradores" mientras el
  // razonamiento seguia afirmando "los 84 colaboradores coinciden con la planilla":
  // la pantalla contradiciendose consigo misma en el bloque que el jurado del sector
  // financiero va a leer con mas atencion. El resumen esta escrito contra datos
  // concretos, asi que o cambian los dos o no cambia ninguno. El monto y el plazo
  // bastan para que dos vueltas no se lean como un bucle.
  return {
    ...spec,
    monto: { ...spec.monto, valor },
    resumen,
    // El plazo tambien se mueve, para que los cinco relojes no caigan en fase.
    plazo: spec.plazo + ((vuelta * 5) % 9) - 4,
    bloqueaEn: 4 + ((vuelta * 3) % 7),
  };
}

function nombreDe(id: string): string {
  return SEMBRADOS.find((a) => a.id === id)?.nombre ?? id;
}

function resumenDe(spec: AgenteSpec): string[] {
  return spec.resumen;
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
