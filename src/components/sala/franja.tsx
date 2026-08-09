"use client";

import { SelloAgente } from "@/components/sala/sellos";
import { useCuentaAtras } from "@/components/sala/useSala";
import type { Tablero } from "@/lib/tablero";

/* La franja de plazos.
 *
 * La pantalla enseñaba una operación grande y escondía las otras cuatro en una
 * columna estrecha, así que las cinco corriendo a la vez, que es el argumento entero
 * del producto, no se veía nunca de un vistazo. Aquí están las cinco con su plazo y
 * su barra, en una sola línea de lectura.
 *
 * Dos cosas que el mockup hacía mal y aquí no se copian:
 *
 * 1. Allí la quinta celda quedaba cortada por el borde. Esto es un grid de cinco
 *    columnas iguales con `minmax(0, 1fr)`, así que ninguna se sale ni se parte: el
 *    texto largo se recorta dentro de su celda, no contra el marco.
 * 2. Allí un carril retenido mostraba "00s". Un reloj a cero afirma que quedan cero
 *    segundos, cuando lo cierto es que ya no corre ninguno. Sin plazo no hay reloj:
 *    va el estado escrito.
 */

const ANCHO_MAX_SEG = 30;

function Celda({
  carril,
  protagonista,
}: {
  carril: Tablero["carriles"][number];
  protagonista: boolean;
}) {
  const seg = useCuentaAtras(carril.deadline);
  const corre = seg != null && seg > 0;
  // La barra mide plazo restante contra la puerta más larga del escenario, no contra
  // el plazo propio: así una barra corta significa poco tiempo en términos absolutos
  // y las cinco se comparan entre sí, que es para lo que está la franja.
  const proporcion = corre ? Math.min(seg / ANCHO_MAX_SEG, 1) : 0;

  const cerrado =
    carril.estado === "aprobado" || carril.estado === "rechazado" || carril.estado === "retenido";
  const colorEstado = corre
    ? "var(--estado-corre)"
    : carril.estado === "aprobado"
      ? "var(--estado-firmada)"
      : carril.estado === "retenido" || carril.estado === "rechazado"
        ? "var(--estado-retenida)"
        : "var(--tinta-tenue)";

  return (
    <div
      style={{
        minWidth: 0,
        paddingRight: "var(--hueco-3)",
        borderRight: "1px solid var(--linea)",
        opacity: cerrado ? 0.62 : 1,
        transition: "opacity var(--dur-ui)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--hueco-2)",
          minWidth: 0,
        }}
      >
        <SelloAgente id={carril.id} tam={18} alta={protagonista} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "var(--paso--1)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--tinta-media)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {carril.nombre}
        </span>
        <span
          className="cifras"
          style={{
            fontSize: "var(--paso--1)",
            color: colorEstado,
          }}
        >
          {corre ? `${String(seg).padStart(2, "0")}s` : "—"}
        </span>
      </div>

      {/* La barra vive siempre, llena o vacía, para que las cinco se lean como una
          misma escala y no como cinco elementos distintos. */}
      <div
        style={{
          height: 2,
          marginTop: "var(--hueco-2)",
          background: "var(--linea)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            transformOrigin: "left",
            transform: `scaleX(${cerrado ? 1 : proporcion})`,
            background: cerrado ? colorEstado : corre ? "var(--estado-corre)" : "transparent",
            transition: "transform 1s linear",
          }}
        />
      </div>

      <div
        style={{
          marginTop: "var(--hueco-2)",
          fontSize: "var(--paso--1)",
          color: "var(--tinta-media)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {carril.operacion}
      </div>
    </div>
  );
}

export function FranjaPlazos({
  tablero,
  protagonistaId,
}: {
  tablero: Tablero;
  protagonistaId: string | null;
}) {
  if (!tablero.arrancado || tablero.carriles.length === 0) return null;

  return (
    <section
      className="franja surge"
      aria-label="Plazo restante de cada operación"
      style={{ marginTop: "var(--hueco-4)" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--hueco-3)",
          paddingBottom: "var(--hueco-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--paso--1)",
            letterSpacing: "0.17em",
            textTransform: "uppercase",
            color: "var(--tinta-tenue)",
          }}
        >
          Plazo restante · {tablero.carriles.length} operaciones
        </span>
        {/* El umbral que gobierna la barra, visible en la interfaz y no solo en el
            codigo: sin esto una barra a media asta no significa nada. */}
        <span className="cifras" style={{ fontSize: "var(--paso--1)", color: "var(--tinta-tenue)" }}>
          0s — {ANCHO_MAX_SEG}s
        </span>
      </div>

      <div className="franja-rejilla">
        {tablero.carriles.map((c) => (
          <Celda key={c.id} carril={c} protagonista={c.id === protagonistaId} />
        ))}
      </div>
    </section>
  );
}
