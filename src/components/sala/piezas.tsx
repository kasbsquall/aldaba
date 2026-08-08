"use client";

import {
  CircleNotch,
  Clock,
  DoorOpen,
  Hourglass,
  Lightning,
  Prohibit,
  Check,
  UserCircleDashed,
  UserCircle,
  Wrench,
} from "@phosphor-icons/react";
import { useCuentaAtras } from "./useSala";
import type { AprobadorVista, CarrilVista, Tablero } from "@/lib/tablero";

// Un solo grosor de icono en todo el producto, y un solo tamano base.
const ICONO = { weight: "light" as const, size: 15 };

function moneda(m: { valor: number; moneda: string }) {
  return `${m.moneda === "USD" ? "US$" : "S/"} ${m.valor.toLocaleString("es-PE")}`;
}

/* ── El contador de escasez ──────────────────────────────────────────────────
 * El protagonista. Es lo unico que hay que entender en los primeros diez
 * segundos, y el unico bloque que ningun otro proyecto va a tener en pantalla. */
export function ContadorEscasez({ tablero }: { tablero: Tablero }) {
  // Disponible es conectado Y libre. Contar solo conectados seria contradecir la
  // tesis del producto en el numero mas grande de la pantalla: alguien que ya esta
  // atendiendo otra operacion esta presente, no disponible.
  const libres = tablero.aprobadores.filter((a) => a.conectado && !a.atendiendo).length;
  const esperan = tablero.carriles.filter((c) => c.estado === "esperando").length;
  const tenso = esperan > libres;

  // Nunca un cero mientras carga. Un contador en cero durante el fetch afirma algo
  // falso sobre el dato: dice que no hay nadie disponible cuando lo que pasa es que
  // todavia no sabemos. Esqueleto hasta que llegue el escenario.
  if (!tablero.arrancado) return <EsqueletoContador />;

  return (
    <section
      className="surge"
      style={{ display: "flex", alignItems: "baseline", gap: "var(--hueco-8)" }}
    >
      <Cifra valor={libres} etiqueta="libres ahora mismo" />
      <span
        aria-hidden
        style={{
          fontSize: "var(--paso-4)",
          color: "var(--tinta-tenue)",
          transform: "translateY(-0.35em)",
        }}
      >
        /
      </span>
      <Cifra valor={esperan} etiqueta="esperan una firma" urgente={tenso} />
    </section>
  );
}

function EsqueletoContador() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando disponibilidad"
      style={{ display: "flex", alignItems: "baseline", gap: "var(--hueco-8)" }}
    >
      {[0, 1].map((i) => (
        <div key={i}>
          <div
            style={{
              width: "3.5rem",
              height: "4rem",
              background: "var(--fondo-hundido)",
              borderRadius: "var(--radio)",
            }}
          />
          <div
            style={{
              width: "7rem",
              height: "0.6rem",
              marginTop: "var(--hueco-3)",
              background: "var(--fondo-hundido)",
              borderRadius: "var(--radio)",
            }}
          />
        </div>
      ))}
    </section>
  );
}

function Cifra({
  valor,
  etiqueta,
  urgente = false,
}: {
  valor: number;
  etiqueta: string;
  urgente?: boolean;
}) {
  return (
    <div>
      <div
        className="dato"
        style={{
          fontSize: "var(--escasez-cifra)",
          lineHeight: 0.86,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          color: urgente ? "var(--urgente)" : "var(--tinta)",
          transition: "color var(--dur-ui) var(--curva-entrada)",
        }}
      >
        {valor}
      </div>
      <div
        style={{
          fontSize: "var(--escasez-etiqueta)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--tinta-tenue)",
          marginTop: "var(--hueco-2)",
        }}
      >
        {etiqueta}
      </div>
    </div>
  );
}

/* ── Roster de presencia ─────────────────────────────────────────────────── */
export function Roster({ aprobadores, miId }: { aprobadores: AprobadorVista[]; miId: string | null }) {
  return (
    <ul style={{ display: "grid", gap: "var(--hueco-1)", listStyle: "none", padding: 0 }}>
      {aprobadores.map((a, i) => (
        <li
          key={a.id}
          className="surge-fila"
          style={
            {
              "--i": Math.min(i, 7),
              display: "flex",
              alignItems: "center",
              gap: "var(--hueco-2)",
              padding: "var(--hueco-2) 0",
              borderBottom: "1px solid var(--linea)",
              color: a.conectado ? "var(--tinta)" : "var(--tinta-tenue)",
            } as React.CSSProperties
          }
        >
          {a.conectado ? (
            <UserCircle {...ICONO} aria-hidden />
          ) : (
            <UserCircleDashed {...ICONO} aria-hidden />
          )}
          <span style={{ fontSize: "var(--paso-0)", fontWeight: a.id === miId ? 600 : 400 }}>
            {a.nombre}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "var(--paso--1)",
              color: "var(--tinta-tenue)",
              textAlign: "right",
            }}
          >
            {a.atendiendo ? "atendiendo" : a.conectado ? "libre" : "ausente"}
            {a.sembrado ? " · automático" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Reloj ───────────────────────────────────────────────────────────────────
 * No parpadea. Se acerca a cero ganando masa, porque el video comprimido de la
 * plataforma destruye las diferencias sutiles de color y no las de tamano. */
export function Reloj({ deadline, grande = false }: { deadline: number | null; grande?: boolean }) {
  const seg = useCuentaAtras(deadline);
  if (seg == null) return null;

  const apremia = seg <= 6;
  return (
    <span
      className="dato"
      style={{
        fontSize: grande ? "var(--carril-reloj)" : "var(--carril-reloj-menor)",
        fontWeight: apremia ? 700 : 500,
        color: apremia ? "var(--urgente)" : "var(--tinta-media)",
        letterSpacing: "-0.03em",
        transition: "font-weight var(--dur-ui), color var(--dur-ui)",
      }}
    >
      {String(seg).padStart(2, "0")}s
    </span>
  );
}

/* ── Fila comprimida ─────────────────────────────────────────────────────────
 * Sin texto en movimiento, a proposito. Cinco flujos de texto compiten por el
 * mismo canal de lectura y el espectador termina sin mirar ninguno. */
export function FilaCarril({
  carril,
  indice,
  nombreDe,
}: {
  carril: CarrilVista;
  indice: number;
  nombreDe: (id: string) => string;
}) {
  const cerrado = carril.estado === "aprobado" || carril.estado === "rechazado" || carril.estado === "retenido";

  return (
    <li
      className="surge-fila"
      style={
        {
          "--i": Math.min(indice, 7),
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "var(--hueco-2)",
          alignItems: "center",
          minHeight: "var(--fila-alto)",
          padding: "var(--hueco-2) 0",
          borderBottom: "1px solid var(--linea)",
          opacity: cerrado ? 0.55 : 1,
          transition: "opacity var(--dur-ui)",
        } as React.CSSProperties
      }
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--paso-0)",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {carril.operacion}
        </div>
        <div
          style={{
            fontSize: "var(--paso--1)",
            color: "var(--tinta-tenue)",
            display: "flex",
            alignItems: "center",
            gap: "var(--hueco-1)",
            marginTop: 2,
          }}
        >
          <EstadoIcono carril={carril} />
          <span>{leyendaEstado(carril, nombreDe)}</span>
        </div>
      </div>
      <Reloj deadline={carril.deadline} />
    </li>
  );
}

function EstadoIcono({ carril }: { carril: CarrilVista }) {
  if (carril.estado === "aprobado") return <Check {...ICONO} aria-hidden />;
  if (carril.estado === "rechazado") return <Prohibit {...ICONO} aria-hidden />;
  if (carril.estado === "retenido") return <Hourglass {...ICONO} aria-hidden />;
  if (carril.estado === "esperando") return <DoorOpen {...ICONO} aria-hidden />;
  return <CircleNotch {...ICONO} aria-hidden />;
}

function leyendaEstado(c: CarrilVista, nombreDe: (id: string) => string): string {
  const quien = (id: string | undefined) => {
    if (!id) return "alguien";
    const n = nombreDe(id);
    // "firmada por Tú" no es español. La primera persona necesita otra preposición.
    return n === "Tú" ? "ti" : n;
  };
  if (c.estado === "aprobado") return `firmada por ${quien(c.veredicto?.aprobador)}`;
  if (c.estado === "rechazado") return `rechazada por ${quien(c.veredicto?.aprobador)}`;
  if (c.estado === "retenido") return "nadie abrió · retenida";
  if (c.estado === "esperando" && c.tocandoA)
    return `tocando a ${nombreDe(c.tocandoA)} · puerta ${c.intento}`;
  if (c.estado === "esperando") return "buscando quién está disponible";
  return "evaluando la operación";
}

/* ── Carril protagonista ─────────────────────────────────────────────────────
 * Es el unico bloque con texto en movimiento en toda la pantalla. */
export function CarrilProtagonista({
  carril,
  esMio,
  nombreDe,
  onDecidir,
}: {
  carril: CarrilVista;
  esMio: boolean;
  nombreDe: (id: string) => string;
  onDecidir: (decision: "aprobado" | "rechazado") => void;
}) {
  const u = carril.umbral;

  return (
    <article
      className="surge"
      style={{
        background: "var(--fondo-elevado)",
        border: "1px solid var(--linea)",
        borderRadius: "var(--radio)",
        boxShadow: "var(--sombra-alta)",
        padding: "var(--hueco-6)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--hueco-4)",
          marginBottom: "var(--hueco-4)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "var(--paso--1)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--tinta-tenue)",
            }}
          >
            {carril.nombre}
          </div>
          <h2 style={{ fontSize: "var(--paso-3)", marginTop: "var(--hueco-1)" }}>
            {carril.operacion}
          </h2>
        </div>
        <Reloj deadline={carril.deadline} grande />
      </header>

      {u && (
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
            gap: "var(--hueco-4)",
            padding: "var(--hueco-3) 0",
            borderTop: "1px solid var(--linea)",
            borderBottom: "1px solid var(--linea)",
            margin: 0,
          }}
        >
          <Campo etiqueta="Monto">
            <span className="dato" style={{ fontSize: "var(--carril-monto)", fontWeight: 600 }}>
              {moneda(u.monto)}
            </span>
          </Campo>
          <Campo etiqueta="Contraparte">{u.contraparte}</Campo>
          <Campo etiqueta="Regla que lo detuvo">{u.regla}</Campo>
        </dl>
      )}

      {/* El razonamiento. Lo unico que se mueve en pantalla. */}
      <div style={{ margin: "var(--hueco-4) 0" }}>
        <Etiqueta>
          <Lightning {...ICONO} aria-hidden /> Razonamiento del agente
        </Etiqueta>
        <ul style={{ listStyle: "none", padding: 0, margin: "var(--hueco-2) 0 0" }}>
          {(u?.resumenRazonamiento ?? carril.razonamiento).slice(-4).map((linea, i) => (
            <li
              key={`${i}-${linea.slice(0, 12)}`}
              className="surge-fila"
              style={
                {
                  "--i": i,
                  fontSize: "var(--paso-0)",
                  color: "var(--tinta-media)",
                  padding: "var(--hueco-1) 0",
                } as React.CSSProperties
              }
            >
              {linea}
            </li>
          ))}
        </ul>
        {carril.herramienta && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--hueco-1)",
              fontSize: "var(--paso--1)",
              color: "var(--tinta-tenue)",
              marginTop: "var(--hueco-2)",
            }}
          >
            <Wrench {...ICONO} aria-hidden />
            <span className="dato">{carril.herramienta.nombre}</span>
            <span>· {carril.herramienta.resumen}</span>
          </div>
        )}
      </div>

      <Cadena carril={carril} nombreDe={nombreDe} />

      {esMio ? (
        <div style={{ display: "flex", gap: "var(--hueco-2)", marginTop: "var(--hueco-6)" }}>
          <Boton principal onClick={() => onDecidir("aprobado")}>
            <Check {...ICONO} aria-hidden /> Firmar y liberar
          </Boton>
          <Boton onClick={() => onDecidir("rechazado")}>
            <Prohibit {...ICONO} aria-hidden /> Rechazar
          </Boton>
        </div>
      ) : (
        <p
          style={{
            marginTop: "var(--hueco-6)",
            fontSize: "var(--paso-0)",
            color: "var(--tinta-tenue)",
          }}
        >
          {carril.estado === "esperando"
            ? `Le toca a ${nombreDe(carril.tocandoA ?? "")}. Si no abre en el plazo, el agente busca a la siguiente persona disponible.`
            : carril.cierre?.resumen ?? "El agente sigue trabajando."}
        </p>
      )}
    </article>
  );
}

/** La cadena de puertas tocadas. Lo que ninguna otra herramienta muestra. */
function Cadena({ carril, nombreDe }: { carril: CarrilVista; nombreDe: (id: string) => string }) {
  if (carril.cadena.length === 0) return null;

  return (
    <div>
      <Etiqueta>
        <Clock {...ICONO} aria-hidden /> Puertas tocadas
      </Etiqueta>
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--hueco-2)",
          listStyle: "none",
          padding: 0,
          margin: "var(--hueco-2) 0 0",
        }}
      >
        {carril.cadena.map((p, i) => (
          <li
            key={`${p.aprobador}-${i}`}
            className="surge-fila"
            style={
              {
                "--i": Math.min(i, 7),
                display: "flex",
                alignItems: "center",
                gap: "var(--hueco-1)",
                fontSize: "var(--paso--1)",
                padding: "var(--hueco-1) var(--hueco-2)",
                background: p.vencio ? "var(--fondo-hundido)" : "var(--urgente-fondo)",
                color: p.vencio ? "var(--tinta-tenue)" : "var(--urgente)",
                borderRadius: "var(--radio)",
              } as React.CSSProperties
            }
          >
            <span className="dato">{i + 1}</span>
            <span>{nombreDe(p.aprobador)}</span>
            <span style={{ opacity: 0.75 }}>
              {p.vencio ? "no abrió" : p.estabaConectado ? "conectado" : "ausente"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt
        style={{
          fontSize: "var(--paso--1)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--tinta-tenue)",
        }}
      >
        {etiqueta}
      </dt>
      <dd style={{ margin: "var(--hueco-1) 0 0", fontSize: "var(--paso-0)" }}>{children}</dd>
    </div>
  );
}

export function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--hueco-1)",
        fontSize: "var(--paso--1)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--tinta-tenue)",
      }}
    >
      {children}
    </div>
  );
}

function Boton({
  children,
  principal = false,
  onClick,
}: {
  children: React.ReactNode;
  principal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--hueco-1)",
        padding: "var(--hueco-2) var(--hueco-4)",
        minHeight: "2.75rem",
        fontFamily: "inherit",
        fontSize: "var(--paso-0)",
        fontWeight: 600,
        cursor: "pointer",
        borderRadius: "var(--radio)",
        border: `1px solid ${principal ? "transparent" : "var(--linea-fuerte)"}`,
        background: principal ? "var(--tinta)" : "transparent",
        color: principal ? "var(--fondo-elevado)" : "var(--tinta)",
        transition: "transform var(--dur-micro), opacity var(--dur-micro)",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </button>
  );
}
