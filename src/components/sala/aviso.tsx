"use client";

import { useEffect, useRef, useState } from "react";
import { DoorOpen } from "@phosphor-icons/react";

/* El aviso de que te tocan la puerta.
 *
 * Es el unico evento de la pantalla que le pasa A TI y no al sistema, y hasta ahora
 * ocurria en silencio: el carril cambiaba y tenias que darte cuenta solo. En una
 * pantalla con cinco relojes corriendo, un cambio silencioso se pierde.
 *
 * Entra desde abajo, dura cuatro segundos y se va. No tiene boton de cerrar a
 * proposito: no es una tarea pendiente, es un aviso de que algo acaba de pasar, y un
 * aviso que exige un clic para desaparecer es una tarea disfrazada.
 *
 * Solo suena cuando el carril que te tocan CAMBIA, nunca en cada render, para que no
 * se dispare al reordenarse el tablero. */

export function AvisoDeToque({
  carril,
  operacion,
}: {
  carril: string | null;
  operacion: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const anterior = useRef<string | null>(null);

  useEffect(() => {
    // Solo cuando pasa de no tocarte a tocarte, o cambia de carril.
    if (!carril || carril === anterior.current) {
      anterior.current = carril;
      return;
    }
    anterior.current = carril;

    setSaliendo(false);
    setVisible(true);

    const sale = setTimeout(() => setSaliendo(true), 3600);
    const fin = setTimeout(() => setVisible(false), 3900);
    return () => {
      clearTimeout(sale);
      clearTimeout(fin);
    };
  }, [carril]);

  if (!visible || !operacion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={saliendo ? "aviso-sale" : "aviso"}
      style={{
        position: "fixed",
        left: "50%",
        bottom: "var(--hueco-8)",
        marginLeft: "-13rem",
        width: "26rem",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: "var(--hueco-3)",
        padding: "var(--hueco-3) var(--hueco-4)",
        background: "var(--tinta)",
        color: "var(--fondo-elevado)",
        borderRadius: "var(--radio)",
        boxShadow: "var(--sombra-alta)",
        pointerEvents: "none",
      }}
    >
      <DoorOpen size={20} weight="light" aria-hidden />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--paso--1)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          Te tocan la puerta
        </div>
        <div
          style={{
            fontSize: "var(--paso-0)",
            fontWeight: 600,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {operacion}
        </div>
      </div>
    </div>
  );
}

/**
 * Una cifra que rueda cuando cambia.
 *
 * Un numero que se sustituye de golpe no comunica que cambio: el ojo lo lee como si
 * siempre hubiera sido ese. Rodando, el cambio es el mensaje, que es justo lo que
 * hace falta en un contador cuyo trabajo es mostrar que la escasez se mueve.
 */
export function CifraViva({
  valor,
  className,
  style,
}: {
  valor: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const [rodando, setRodando] = useState(false);

  useEffect(() => {
    if (valor === mostrado) return;
    setRodando(true);
    const t = setTimeout(() => {
      setMostrado(valor);
      setRodando(false);
    }, 120);
    return () => clearTimeout(t);
  }, [valor, mostrado]);

  return (
    <span
      className={`${className ?? ""} ${rodando ? "" : "cifra-rueda"}`.trim()}
      key={mostrado}
      style={{ display: "inline-block", ...style }}
    >
      {mostrado}
    </span>
  );
}
