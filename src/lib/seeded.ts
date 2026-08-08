import { Portal, type ChannelHandle } from "@portalsdk/core";
import { mintToken } from "./identity";
import type { Approver } from "./cast";

// Aprobadores sembrados.
//
// No son presencia falsa: cada uno abre su propia conexion a Portal con su propia
// identidad, asi que el roster que lee el orquestador es presencia real. Lo unico
// guionado es su comportamiento, y eso se declara en pantalla y en el README.
//
// Un jurado que descubre un actor disfrazado de persona castiga mucho mas que uno
// que ve un actor honesto. Por eso el escenario los marca como `sembrado: true` y la
// interfaz los rotula como participantes automaticos.
//
// Su papel en la demostracion:
//   - Rivas entra al inicio y nunca responde. Es quien demuestra que estar presente
//     no es lo mismo que estar disponible, que es la distincion que el producto
//     entero defiende.
//   - Okada entra tarde. Su llegada reordena la cola en vivo, y ese es el momento en
//     que se ve que la presencia gobierna el enrutamiento.

type ResolverFn = (
  agenteId: string,
  aprobadorId: string,
  decision: "aprobado" | "rechazado"
) => Promise<unknown>;

export class ActorSembrado {
  private portal: Portal | null = null;
  private sala: ChannelHandle | null = null;
  private temporizadores: ReturnType<typeof setTimeout>[] = [];
  private atendiendo = false;

  constructor(
    private readonly approver: Approver,
    private readonly canalId: string,
    private readonly resolver: ResolverFn
  ) {}

  get id() {
    return this.approver.id;
  }

  /** Programa la entrada segun su guion. Devuelve de inmediato. */
  planificar(): void {
    const guion = this.approver.guion;
    if (!guion) return;
    this.temporizadores.push(
      setTimeout(() => void this.conectar(), Math.max(0, guion.entraEn) * 1000)
    );
  }

  private async conectar(): Promise<void> {
    if (this.sala) return;

    const token = await mintToken({
      userId: this.approver.id,
      username: this.approver.nombre,
    });
    this.portal = new Portal({ apiKey: process.env.NEXT_PUBLIC_PORTAL_KEY!, token });

    const sala = this.portal.channel(this.canalId, { history: "none" });
    sala.on("message", (m) => this.alRecibir(m as { type?: string; content?: unknown }));
    sala.acquire();
    this.sala = sala;
  }

  private alRecibir(m: { type?: string; content?: unknown }): void {
    if (m.type !== "aldaba.knock") return;

    const k = m.content as { to?: string; agente?: string } | undefined;
    if (!k?.to || !k.agente || k.to !== this.approver.id) return;

    const responde = this.approver.guion?.respondeEn;
    // `null` significa que nunca abre. Esta conectado y no contesta, que es
    // precisamente el caso que ninguna otra herramienta distingue.
    if (responde == null) return;

    // Una persona atiende una cosa a la vez. Si ya esta resolviendo otro carril, no
    // se clona para contestar dos toques en paralelo.
    if (this.atendiendo) return;
    this.atendiendo = true;

    const agenteId = k.agente;
    this.temporizadores.push(
      setTimeout(() => {
        void this.resolver(agenteId, this.approver.id, "aprobado").finally(() => {
          this.atendiendo = false;
        });
      }, responde * 1000)
    );
  }

  detener(): void {
    this.temporizadores.forEach(clearTimeout);
    this.temporizadores = [];
    this.sala?.release();
    this.sala = null;
    this.portal = null;
  }
}
