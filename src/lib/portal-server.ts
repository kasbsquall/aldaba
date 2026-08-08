import { Portal, type ChannelHandle } from "@portalsdk/core";
import { mintToken } from "./identity";
import type { MensajeAldaba, TipoMensaje } from "./protocol";
import { esPersistente } from "./protocol";

// El orquestador mantiene una conexion propia al canal de la sala. La necesita para
// dos cosas que no se pueden hacer desde el cliente: leer la presencia como entrada
// de la decision de a quien tocar, y publicar los hitos con una identidad de agente.
//
// Node 22 trae WebSocket global, asi que @portalsdk/core funciona tal cual fuera del
// navegador. Verificado en scripts/spike-inbox.mjs.

const IDENTIDAD_ORQUESTADOR = { userId: "orq_aldaba", username: "Aldaba" };

export interface Participante {
  id: string;
  nombre: string;
  /** Lo que la persona declaro sobre si misma, no lo que el sistema infiere. */
  ocupado: boolean;
}

export interface Presencia {
  participantes: Participante[];
  conectados: string[];
  total: number;
  /** `false` cuando el canal reporta presencia agregada y no hay lista nominal. */
  nominal: boolean;
}

export class SalaServidor {
  private portal: Portal | null = null;
  private sala: ChannelHandle | null = null;

  constructor(readonly canalId: string) {}

  async conectar(): Promise<void> {
    if (this.sala) return;

    const token = await mintToken(IDENTIDAD_ORQUESTADOR);
    this.portal = new Portal({
      apiKey: process.env.NEXT_PUBLIC_PORTAL_KEY!,
      token,
    });

    const sala = this.portal.channel(this.canalId, { history: "none" });
    sala.acquire();
    this.sala = sala;

    await this.esperarListo(sala);
  }

  private esperarListo(sala: ChannelHandle, ms = 8000): Promise<void> {
    if (sala.status === "ready") return Promise.resolve();
    return new Promise((resolve) => {
      const corta = setTimeout(finalizar, ms);
      const off = sala.on("status", (estado) => {
        if (estado === "ready" || estado === "blocked") finalizar();
      });
      function finalizar() {
        clearTimeout(corta);
        off();
        resolve();
      }
    });
  }

  /**
   * Quien esta conectado ahora mismo. Es la entrada del enrutamiento, no un adorno
   * de la interfaz: de aqui sale a quien se le toca la puerta.
   */
  presencia(): Presencia {
    const p = this.sala?.presence;
    if (!p) return { participantes: [], conectados: [], total: 0, nominal: true };
    if (p.kind === "detailed") {
      // `metadata` la escribe cada navegador con `setMetadata`. Es lo que convierte
      // "estar presente" en "estar disponible": dos cosas distintas, y la diferencia
      // entre ambas es todo el producto.
      const participantes = p.participants.map((u) => ({
        id: u.id,
        nombre: (u.username as string | undefined) ?? u.id,
        ocupado: (u.metadata as { estado?: string } | undefined)?.estado === "ocupado",
      }));
      return {
        participantes,
        conectados: participantes.map((u) => u.id),
        total: p.count,
        nominal: true,
      };
    }
    // En canales grandes Portal deja de mandar el roster nominal. Con una cadena de
    // tres aprobadores no deberia ocurrir, pero si ocurre hay que saberlo en vez de
    // enrutar contra una lista vacia.
    return { participantes: [], conectados: [], total: p.count, nominal: false };
  }

  async publicar(mensaje: MensajeAldaba, para?: string): Promise<void> {
    if (!this.sala) throw new Error("La sala no esta conectada");

    const persistente = esPersistente(mensaje.type as TipoMensaje);
    await this.sala.send({
      type: mensaje.type,
      content: mensaje.content,
      ...(para ? { to: para } : {}),
      // Lo efimero no sobrevive a un refresh. Solo va asi el ruido de fondo; todo
      // lo que la pantalla necesita para contar la historia va persistente.
      ...(persistente ? {} : { ephemeral: true }),
    });
  }

  cerrar(): void {
    this.sala?.release();
    this.sala = null;
    this.portal = null;
  }
}
