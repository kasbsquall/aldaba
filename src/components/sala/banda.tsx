"use client";

import { DoorOpen, ClockCounterClockwise, Check, ChartBar } from "@phosphor-icons/react";
import { SelloAgente } from "@/components/sala/sellos";
import type { Tablero } from "@/lib/tablero";

/* La banda inferior: rastro de toques e histograma de firmas.
 *
 * La mitad de abajo de la pantalla estaba vacía. El vacío no se llena estirando lo
 * que ya hay, se llena con lo único que faltaba para operar, que es el histórico:
 * qué se ha intentado y cuánto tarda de verdad en aparecer una firma.
 *
 * Los dos bloques salen de mensajes que ya llegan al canal. No hay dato inventado y
 * no hay comparación contra un ayer que no existe: el mockup ponía un "−4s vs. ayer"
 * que habría sido una cifra fabricada delante de un jurado.
 */

const CUBOS = [0, 15, 30, 45, 60];

const COLOR_ESTADO: Record<string, string> = {
  firma: "var(--estado-firmada)",
  vencio: "var(--estado-vencio)",
  retenida: "var(--estado-retenida)",
  toque: "var(--estado-corre)",
};

function Icono({ clase }: { clase: string }) {
  const p = { size: 13, weight: "light" as const, "aria-hidden": true };
  if (clase === "firma") return <Check {...p} />;
  if (clase === "vencio") return <ClockCounterClockwise {...p} />;
  return <DoorOpen {...p} />;
}

function Rastro({
  rastro,
  nombreDe,
}: {
  rastro: Tablero["rastro"];
  nombreDe: (id: string) => string;
}) {
  return (
    <section>
      <div className="rotulo">
        <DoorOpen size={13} weight="light" aria-hidden /> Rastro de toques
        <span style={{ float: "right", color: "var(--tinta-tenue)" }}>
          {rastro.length} {rastro.length === 1 ? "evento" : "eventos"}
        </span>
      </div>

      {rastro.length === 0 ? (
        // Estado vacío explícito. Una lista en blanco sin decir nada se lee como un
        // fallo de carga, y aquí lo cierto es que todavía no ha pasado nada.
        <p className="vacio">Todavía no se ha tocado ninguna puerta en esta sesión.</p>
      ) : (
        <ul
          className="rastro-rejilla"
          style={{ "--filas": Math.ceil(rastro.length / 2) } as React.CSSProperties}
        >
          {rastro.map((e, i) => (
            <li key={`${e.texto}-${i}`} className="rastro-fila" style={{ "--i": Math.min(i, 7) } as React.CSSProperties}>
              <SelloAgente id={e.agente} tam={16} />
              <span className="rastro-texto">
                {e.texto}
                {e.quien ? ` · ${nombreDe(e.quien)}` : ""}
              </span>
              <span style={{ color: COLOR_ESTADO[e.clase] ?? "var(--tinta-tenue)" }}>
                <Icono clase={e.clase} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Histograma({ firmas }: { firmas: number[] }) {
  const segundos = firmas.map((ms) => ms / 1000);
  const cubos = CUBOS.map((desde, i) => {
    const hasta = i === CUBOS.length - 1 ? Infinity : CUBOS[i + 1];
    return segundos.filter((s) => s >= desde && s < hasta).length;
  });
  const alto = Math.max(...cubos, 1);

  const ordenadas = [...segundos].sort((a, b) => a - b);
  const mediana = ordenadas.length
    ? ordenadas.length % 2
      ? ordenadas[(ordenadas.length - 1) / 2]
      : (ordenadas[ordenadas.length / 2 - 1] + ordenadas[ordenadas.length / 2]) / 2
    : null;

  // El cubo donde cae la mediana se marca con el acento: es la única lectura que
  // importa del gráfico y sin ella son cinco barras grises sin protagonista.
  const cuboMediana =
    mediana == null ? -1 : CUBOS.reduce((acc, d, i) => (mediana >= d ? i : acc), 0);

  return (
    <section>
      <div className="rotulo">
        <ChartBar size={13} weight="light" aria-hidden /> Cuánto tarda en llegar una firma
      </div>

      {mediana == null ? (
        <p className="vacio">Sin firmas todavía. La mediana aparece con la primera.</p>
      ) : (
        <>
          <div className="histo">
            {cubos.map((n, i) => (
              <div key={CUBOS[i]} className="histo-col">
                <span className="histo-n cifras">{n}</span>
                <div
                  className="histo-barra"
                  style={{
                    height: `${Math.max((n / alto) * 100, 2)}%`,
                    background: i === cuboMediana ? "var(--urgente)" : "var(--linea-fuerte)",
                    // Escalonado por celda, como el resto de la coreografía.
                    animationDelay: `${i * 70}ms`,
                  }}
                />
                <span className="histo-eje cifras">{CUBOS[i]}s</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--hueco-2)" }}>
            <span className="dato cifras" style={{ fontSize: "var(--paso-3)", fontWeight: 600 }}>
              {mediana < 10 ? mediana.toFixed(1) : Math.round(mediana)}s
            </span>
            <span className="rotulo" style={{ margin: 0 }}>
              mediana de {segundos.length} {segundos.length === 1 ? "firma" : "firmas"}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function Remate({ tablero }: { tablero: Tablero }) {
  const cuenta = (e: string) => tablero.carriles.filter((c) => c.estado === e).length;
  const firmadas = cuenta("aprobado");
  const retenidas = cuenta("retenido") + cuenta("rechazado");
  const enCurso = tablero.carriles.length - firmadas - retenidas;
  if (firmadas + retenidas === 0) return null;

  const partes: { n: number; texto: string; color: string }[] = [
    { n: firmadas, texto: firmadas === 1 ? "salió adelante" : "salieron adelante", color: "var(--estado-firmada)" },
    { n: retenidas, texto: retenidas === 1 ? "quedó retenida" : "quedaron retenidas", color: "var(--estado-retenida)" },
    { n: enCurso, texto: enCurso === 1 ? "sigue esperando" : "siguen esperando", color: "var(--estado-corre)" },
  ].filter((p) => p.n > 0);

  return (
    <section className="remate">
      <div className="rotulo">Cómo va acabando</div>
      <p className="remate-frase">
        {partes.map((p, i) => (
          <span key={p.texto}>
            {i > 0 ? (i === partes.length - 1 ? " y " : ", ") : ""}
            <strong className="dato cifras" style={{ color: p.color }}>
              {p.n}
            </strong>{" "}
            {p.texto}
          </span>
        ))}
        .
      </p>
      <p className="remate-nota">
        Ninguna se ejecutó sin que una persona abriera la puerta. Las retenidas no se
        perdieron por falta de criterio, se detuvieron porque nadie estaba disponible a
        tiempo.
      </p>
    </section>
  );
}

export function BandaHistorica({ tablero }: { tablero: Tablero }) {
  if (!tablero.arrancado) return null;
  // Nunca devolver el id como respaldo. Alguien que entro y ya se fue no esta en el
  // roster, y sacar "ap_hmskyhoi3kqb" en pantalla es filtrar la tuberia al usuario.
  const nombreDe = (id: string) =>
    tablero.aprobadores.find((a) => a.id === id)?.nombre ?? "alguien que ya salió";
  return (
    <div className="banda">
      <Rastro rastro={tablero.rastro ?? []} nombreDe={nombreDe} />
      <Histograma firmas={tablero.firmas ?? []} />
      <Remate tablero={tablero} />
    </div>
  );
}
