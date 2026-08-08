"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChannel } from "@portalsdk/react";
import { canalDeCaso } from "@/lib/protocol";
import { reducir, tableroVacio, type Tablero } from "@/lib/tablero";

// Conecta la sala y deriva el tablero.
//
// El estado sale de reducir TODOS los mensajes del canal, historial incluido. Asi
// quien abre la URL con la sala ya corriendo llega exactamente al mismo tablero que
// quien estaba desde el principio, sin ninguna reconciliacion aparte.

export interface Sala {
  tablero: Tablero;
  estado: string;
  miId: string | null;
  /** El carril que le toca decidir a esta persona ahora mismo. */
  miCarril: string | null;
  decidir: (agente: string, decision: "aprobado" | "rechazado") => Promise<void>;
  reiniciar: () => Promise<void>;
  /** Lo que esta persona declaro sobre su propia disponibilidad. */
  ocupado: boolean;
  declararOcupado: (v: boolean) => void;
}

export function useSala(sesionId: string | null, miId: string | null): Sala {
  const [arrancando, setArrancando] = useState(true);
  // La foto del tablero que devuelve el servidor al arrancar. El canal entrega en
  // vivo pero no persiste nada, asi que sin esta base quien llega tarde se queda
  // con una pantalla vacia para siempre.
  const [base, setBase] = useState<Tablero>(tableroVacio);
  const pedido = useRef(false);

  // `channelId: undefined` deja el hook inerte y sin abrir conexion, que es lo
  // correcto mientras el id de sala todavia no existe.
  const { messages, status, setMetadata, presence } = useChannel({
    channelId: sesionId ? canalDeCaso(sesionId) : undefined,
  });

  // Lo que esta persona declara sobre si misma. Viaja como metadata de presencia,
  // que el orquestador lee server-side para decidir a quien tocarle la puerta.
  //
  // Es la pieza que convierte la tesis en algo que el usuario HACE. Sin esto,
  // "estar presente no es estar disponible" es una frase del README; con esto, se
  // declara con un clic y el enrutamiento cambia delante de los demas.
  const [ocupado, setOcupado] = useState(false);

  // El escenario arranca solo al abrir la URL. Nunca hay un estado inicial vacio
  // esperando a que el visitante haga algo.
  useEffect(() => {
    if (!sesionId || pedido.current) return;
    pedido.current = true;
    void fetch("/api/sesion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sesionId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tablero) setBase(d.tablero as Tablero);
      })
      .catch(() => {})
      .finally(() => setArrancando(false));
  }, [sesionId]);

  // Los mensajes en vivo se aplican encima de la foto, no desde cero.
  const conMensajes = useMemo(
    () => (messages ?? []).reduce<Tablero>((t, m) => reducir(t, m), base),
    [messages, base]
  );

  /**
   * El roster sale de la presencia del propio cliente, no de un mensaje.
   *
   * Es lo unico verdaderamente en vivo de la pantalla: cuando alguien abre la URL
   * o pulsa "estoy ocupado", los demas lo ven sin que el servidor publique nada.
   * Portal empuja el cambio de metadata a todos los conectados.
   */
  const tablero = useMemo(() => {
    if (!presence || presence.kind !== "detailed") return conMensajes;

    const vivos = presence.participants
      .filter((p) => p.id !== "orq_aldaba")
      .map((p) => ({
        id: p.id,
        nombre: (p.username as string | undefined) ?? p.id,
        ocupado: (p.metadata as { estado?: string } | undefined)?.estado === "ocupado",
      }));
    const vivosPorId = new Map(vivos.map((v) => [v.id, v]));

    const conocidos = new Map(conMensajes.aprobadores.map((a) => [a.id, a]));
    const roster = vivos.map((v) => {
      const previo = conocidos.get(v.id);
      return {
        id: v.id,
        nombre: v.nombre,
        rol: previo?.rol ?? "Aprobador de turno",
        sembrado: previo?.sembrado ?? false,
        conectado: true,
        ocupado: v.ocupado,
        atendiendo: previo?.atendiendo ?? null,
      };
    });
    // Los que el tablero conoce pero ya no estan conectados siguen listados, en gris.
    for (const a of conMensajes.aprobadores) {
      if (!vivosPorId.has(a.id)) roster.push({ ...a, conectado: false, ocupado: false });
    }

    return { ...conMensajes, aprobadores: roster };
  }, [conMensajes, presence]);

  const miCarril = useMemo(() => {
    if (!miId) return null;
    return tablero.carriles.find((c) => c.tocandoA === miId)?.id ?? null;
  }, [tablero, miId]);

  async function decidir(agente: string, decision: "aprobado" | "rechazado") {
    if (!miId || !sesionId) return;
    await fetch("/api/veredicto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sesionId, agente, aprobador: miId, decision }),
    });
  }

  async function reiniciar() {
    if (!sesionId) return;
    await fetch("/api/sesion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sesionId, reset: true }),
    });
    window.location.reload();
  }

  function declararOcupado(v: boolean) {
    setOcupado(v);
    setMetadata({ estado: v ? "ocupado" : "libre" });
  }

  return {
    tablero,
    ocupado,
    declararOcupado,
    estado: arrancando ? "arrancando" : status,
    miId,
    miCarril,
    decidir,
    reiniciar,
  };
}

/** Cuenta atras derivada del instante absoluto que fija el servidor. */
export function useCuentaAtras(deadline: number | null): number | null {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (deadline == null) return;
    const t = setInterval(() => setAhora(Date.now()), 200);
    return () => clearInterval(t);
  }, [deadline]);

  if (deadline == null) return null;
  return Math.max(0, Math.ceil((deadline - ahora) / 1000));
}
