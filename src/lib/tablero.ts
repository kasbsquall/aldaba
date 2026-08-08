import type {
  Done,
  Escenario,
  Handoff,
  Knock,
  Reason,
  Resume,
  Roster,
  Threshold,
  Timeout,
  ToolCall,
  Verdict,
} from "./protocol";

// Reconstruye el tablero a partir del flujo de mensajes del canal.
//
// El historial de Portal es la fuente de verdad, no un estado que el cliente
// mantenga aparte. Eso hace que quien abre la URL con la sala ya corriendo llegue al
// mismo tablero que quien estaba desde el principio, sin ninguna logica de
// reconciliacion: se reproduce el historial por el mismo reductor y ya esta.

export type EstadoCarril =
  | "trabajando"
  | "esperando"
  | "aprobado"
  | "rechazado"
  | "retenido";

export interface CarrilVista {
  id: string;
  nombre: string;
  operacion: string;
  estado: EstadoCarril;
  razonamiento: string[];
  herramienta: { nombre: string; resumen: string } | null;
  umbral: Threshold | null;
  /** A quien se le esta tocando ahora. */
  tocandoA: string | null;
  intento: number;
  /** Instante absoluto de vencimiento. La cuenta atras se deriva de aqui. */
  deadline: number | null;
  /** Puertas ya tocadas, en orden, para dibujar la cadena. */
  cadena: { aprobador: string; estabaConectado: boolean; vencio: boolean }[];
  veredicto: Verdict | null;
  cierre: Done | null;
  cedio: Handoff | null;
}

export interface AprobadorVista {
  id: string;
  nombre: string;
  rol: string;
  sembrado: boolean;
  conectado: boolean;
  /** Lo que declaro sobre si mismo, distinto de lo que el sistema infiere. */
  ocupado?: boolean;
  /** Que carril esta atendiendo, si atiende alguno. */
  atendiendo: string | null;
}

export interface Tablero {
  arrancado: boolean;
  carriles: CarrilVista[];
  aprobadores: AprobadorVista[];
  /** El ultimo reparto de atencion decidido por el arbitro. */
  arbitraje: { motivo: string; libres: number; porModelo: boolean } | null;
}

export const tableroVacio: Tablero = {
  arrancado: false,
  carriles: [],
  aprobadores: [],
  arbitraje: null,
};

interface MensajeEntrante {
  type?: string;
  content?: unknown;
}

/** Cuantos esperan una firma ahora mismo. Es la mitad del contador de escasez. */
export function esperando(t: Tablero): number {
  return t.carriles.filter((c) => c.estado === "esperando").length;
}

/** Cuantas personas hay conectadas. La otra mitad del contador. */
export function disponibles(t: Tablero): number {
  return t.aprobadores.filter((a) => a.conectado).length;
}

export function reducir(previo: Tablero, m: MensajeEntrante): Tablero {
  const tipo = m.type ?? "";
  if (!tipo.startsWith("aldaba.")) return previo;

  const carriles = [...previo.carriles];
  const aprobadores = [...previo.aprobadores];
  const idx = (id: string) => carriles.findIndex((c) => c.id === id);

  const parchear = (id: string, cambio: Partial<CarrilVista>): Tablero => {
    const i = idx(id);
    if (i < 0) return previo;
    carriles[i] = { ...carriles[i], ...cambio };
    return { ...previo, carriles, aprobadores };
  };

  switch (tipo) {
    case "aldaba.escenario": {
      const c = m.content as Escenario;
      return {
        ...previo,
        arrancado: true,
        carriles: c.agentes.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          operacion: a.operacion,
          estado: "trabajando",
          razonamiento: [],
          herramienta: null,
          umbral: null,
          tocandoA: null,
          intento: 0,
          deadline: null,
          cadena: [],
          veredicto: null,
          cierre: null,
          cedio: null,
        })),
        aprobadores: c.aprobadores.map((a) => ({
          ...a,
          conectado: false,
          atendiendo: null,
        })),
      };
    }

    case "aldaba.reason": {
      const c = m.content as Reason;
      const i = idx(c.agente);
      if (i < 0) return previo;
      // Solo las ultimas lineas: el carril comprimido muestra una y el protagonista
      // unas pocas. Guardar el historial completo no aporta y engorda el render.
      const razonamiento = [...carriles[i].razonamiento, c.texto].slice(-6);
      return parchear(c.agente, { razonamiento });
    }

    case "aldaba.tool": {
      const c = m.content as ToolCall;
      return parchear(c.agente, {
        herramienta: { nombre: c.herramienta, resumen: c.resumen ?? "" },
      });
    }

    case "aldaba.threshold": {
      const c = m.content as Threshold;
      return parchear(c.agente, { estado: "esperando", umbral: c, herramienta: null });
    }

    case "aldaba.roster": {
      const c = m.content as Roster;
      const conectados = new Set(c.conectados);
      return {
        ...previo,
        carriles,
        aprobadores: aprobadores.map((a) => ({
          ...a,
          conectado: conectados.has(a.id),
        })),
      };
    }

    case "aldaba.knock": {
      const c = m.content as Knock;
      const i = idx(c.agente);
      if (i < 0) return previo;
      const marcado = aprobadores.map((a) =>
        a.id === c.to ? { ...a, atendiendo: c.agente, conectado: c.estabaConectado || a.conectado } : a
      );
      carriles[i] = {
        ...carriles[i],
        estado: "esperando",
        tocandoA: c.to,
        intento: c.intento,
        deadline: Date.parse(c.deadline),
        cadena: [
          ...carriles[i].cadena,
          { aprobador: c.to, estabaConectado: c.estabaConectado, vencio: false },
        ],
      };
      return { ...previo, carriles, aprobadores: marcado };
    }

    case "aldaba.timeout": {
      const c = m.content as Timeout;
      const i = idx(c.agente);
      if (i < 0) return previo;
      const cadena = carriles[i].cadena.map((p, j) =>
        j === carriles[i].cadena.length - 1 ? { ...p, vencio: true } : p
      );
      carriles[i] = { ...carriles[i], cadena, deadline: null, tocandoA: null };
      return {
        ...previo,
        carriles,
        aprobadores: aprobadores.map((a) =>
          a.id === c.aprobador ? { ...a, atendiendo: null } : a
        ),
      };
    }

    case "aldaba.verdict": {
      const c = m.content as Verdict;
      const i = idx(c.agente);
      if (i < 0) return previo;
      carriles[i] = {
        ...carriles[i],
        estado: c.decision === "aprobado" ? "aprobado" : "rechazado",
        veredicto: c,
        deadline: null,
        tocandoA: null,
      };
      return {
        ...previo,
        carriles,
        aprobadores: aprobadores.map((a) =>
          a.id === c.aprobador ? { ...a, atendiendo: null } : a
        ),
      };
    }

    case "aldaba.resume": {
      const c = m.content as Resume;
      return parchear(c.agente, {});
    }

    case "aldaba.arbitraje": {
      const c = m.content as { motivo: string; libres: number; porModelo: boolean };
      return {
        ...previo,
        arbitraje: { motivo: c.motivo, libres: c.libres, porModelo: c.porModelo },
      };
    }

    case "aldaba.handoff": {
      const c = m.content as Handoff;
      return parchear(c.de, { cedio: c });
    }

    case "aldaba.done": {
      const c = m.content as Done;
      return parchear(c.agente, {
        cierre: c,
        estado: c.desenlace === "retenido" ? "retenido" : carriles[idx(c.agente)]?.estado,
        deadline: null,
      });
    }

    default:
      return previo;
  }
}
