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
}

export function useSala(sesionId: string, miId: string | null): Sala {
  const [arrancando, setArrancando] = useState(true);
  const pedido = useRef(false);

  const { messages, status } = useChannel({ channelId: canalDeCaso(sesionId) });

  // El escenario arranca solo al abrir la URL. Nunca hay un estado inicial vacio
  // esperando a que el visitante haga algo.
  useEffect(() => {
    if (pedido.current) return;
    pedido.current = true;
    void fetch("/api/sesion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sesionId }),
    })
      .catch(() => {})
      .finally(() => setArrancando(false));
  }, [sesionId]);

  const tablero = useMemo(
    () => (messages ?? []).reduce<Tablero>((t, m) => reducir(t, m), tableroVacio),
    [messages]
  );

  const miCarril = useMemo(() => {
    if (!miId) return null;
    return tablero.carriles.find((c) => c.tocandoA === miId)?.id ?? null;
  }, [tablero, miId]);

  async function decidir(agente: string, decision: "aprobado" | "rechazado") {
    if (!miId) return;
    await fetch("/api/veredicto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sesionId, agente, aprobador: miId, decision }),
    });
  }

  async function reiniciar() {
    await fetch("/api/sesion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sesionId, reset: true }),
    });
    window.location.reload();
  }

  return {
    tablero,
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
