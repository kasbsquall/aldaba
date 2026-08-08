"use client";

import { useEffect, useRef, useState } from "react";
import { CircleNotch, X } from "@phosphor-icons/react";

/* El contrafactual: ocho segundos mostrando lo que pasa hoy.
 *
 * Sin este plano, la sala se evalua como diseno de dashboard. Con el, se evalua
 * como respuesta a un problema que el espectador acaba de ver. Es el unico bloque
 * de la interfaz cuyo trabajo es hacer que el siguiente signifique algo.
 *
 * Lo que se ve: un agente detenido pidiendo una aprobacion por un canal cualquiera,
 * y un cronometro que sube sin techo. La cifra es lo unico que se mueve.
 *
 * El reloj arranca en cuatro horas y sigue subiendo acelerado. Cuatro horas no es
 * una exageracion: es lo que pasa cuando el mensaje llega a alguien que no estaba
 * mirando, y es precisamente lo que ninguna herramienta actual puede evitar porque
 * ninguna sabe quien esta disponible. */

const DURACION = 8200;
const ARRANQUE_SEG = 4 * 3600 + 11 * 60 + 6;

function reloj(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Contrafactual({ onTerminar }: { onTerminar: () => void }) {
  const [transcurrido, setTranscurrido] = useState(ARRANQUE_SEG);
  const [saliendo, setSaliendo] = useState(false);
  const cerrado = useRef(false);

  function cerrar() {
    if (cerrado.current) return;
    cerrado.current = true;
    setSaliendo(true);
    // Deja terminar la transicion de salida antes de desmontar.
    setTimeout(onTerminar, 220);
  }

  useEffect(() => {
    const inicio = performance.now();

    // El reloj acelera: los primeros segundos avanzan lento y despues se dispara.
    // Un contador lineal se lee como un cronometro; uno que acelera se lee como
    // tiempo que se escapa, que es la sensacion que hay que producir.
    const cuadro = setInterval(() => {
      const t = (performance.now() - inicio) / DURACION;
      setTranscurrido(ARRANQUE_SEG + Math.floor(t * t * 7400));
    }, 60);

    const fin = setTimeout(cerrar, DURACION);

    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") cerrar();
    }
    window.addEventListener("keydown", alTeclear);

    return () => {
      clearInterval(cuadro);
      clearTimeout(fin);
      window.removeEventListener("keydown", alTeclear);
    };
    // Se monta una sola vez a proposito: es una secuencia, no un estado reactivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Cómo funciona hoy la aprobación humana"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--fondo)",
        display: "grid",
        placeItems: "center",
        padding: "var(--hueco-8)",
        opacity: saliendo ? 0 : 1,
        transition: "opacity 220ms var(--curva-entrada)",
      }}
    >
      <button
        type="button"
        onClick={cerrar}
        style={{
          position: "absolute",
          top: "var(--hueco-6)",
          right: "var(--hueco-6)",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--hueco-1)",
          minHeight: "2.75rem",
          padding: "0 var(--hueco-3)",
          background: "transparent",
          border: "1px solid var(--linea-fuerte)",
          borderRadius: "var(--radio)",
          color: "var(--tinta-media)",
          font: "inherit",
          fontSize: "var(--paso--1)",
          cursor: "pointer",
        }}
      >
        <X size={13} weight="light" aria-hidden />
        Saltar
      </button>

      <div style={{ maxWidth: "44rem", width: "100%" }}>
        <p
          className="surge"
          style={{
            fontSize: "var(--paso--1)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--tinta-tenue)",
            margin: 0,
          }}
        >
          Así funciona hoy
        </p>

        <h1
          className="surge"
          style={{
            // Un solo bloque de texto grande, y el resto callado.
            fontSize: "var(--paso-5)",
            margin: "var(--hueco-3) 0 var(--hueco-12)",
            maxWidth: "28ch",
            ["--i" as string]: 1,
          }}
        >
          Un agente pide permiso y se queda esperando.
        </h1>

        {/* La tarjeta congelada. Deliberadamente apagada: es el mundo de antes. */}
        <div
          className="surge"
          style={{
            ["--i" as string]: 2,
            border: "1px solid var(--linea)",
            borderRadius: "var(--radio)",
            background: "var(--fondo-hundido)",
            padding: "var(--hueco-6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--hueco-4)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "var(--paso-0)", color: "var(--tinta-media)" }}>
                Agente de pagos
              </div>
              <div style={{ fontSize: "var(--paso-2)", fontWeight: 600, marginTop: 2 }}>
                Transferencia a proveedor nuevo
              </div>
              <div
                className="dato"
                style={{ fontSize: "var(--paso-0)", color: "var(--tinta-media)", marginTop: 4 }}
              >
                S/ 48,200
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "var(--hueco-1)",
                  fontSize: "var(--paso--1)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--tinta-tenue)",
                }}
              >
                <CircleNotch size={13} weight="light" aria-hidden />
                Detenido esperando aprobación
              </div>
              {/* Lo unico que se mueve en toda la pantalla. */}
              <div
                className="dato"
                aria-live="off"
                style={{
                  fontSize: "var(--paso-6)",
                  fontWeight: 600,
                  lineHeight: 1,
                  letterSpacing: "-0.035em",
                  marginTop: "var(--hueco-2)",
                  color: "var(--tinta)",
                }}
              >
                {reloj(transcurrido)}
              </div>
            </div>
          </div>
        </div>

        <p
          className="surge"
          style={{
            ["--i" as string]: 3,
            fontSize: "var(--paso-1)",
            color: "var(--tinta-media)",
            marginTop: "var(--hueco-8)",
            maxWidth: "52ch",
          }}
        >
          El mensaje salió a un canal donde no había nadie mirando. Ninguna herramienta
          de las que existen hoy puede evitarlo, porque ninguna sabe quién está
          disponible en este momento.
        </p>
      </div>
    </div>
  );
}

/** Se muestra una vez por sala. Recargar no lo repite; reiniciar el escenario sí. */
export function usarContrafactual(sesion: string | null): [boolean, () => void] {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sesion) return;
    const clave = `aldaba:visto:${sesion}`;
    if (sessionStorage.getItem(clave)) return;
    setVisible(true);
  }, [sesion]);

  function cerrar() {
    if (sesion) sessionStorage.setItem(`aldaba:visto:${sesion}`, "1");
    setVisible(false);
  }

  return [visible, cerrar];
}
