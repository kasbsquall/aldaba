"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { AldabaLogo } from "@/components/marca/Aldaba";
import { Proveedor, type Identidad } from "./providers";
import { useSala } from "@/components/sala/useSala";
import { Contrafactual, usarContrafactual } from "@/components/sala/Contrafactual";
import {
  CarrilProtagonista,
  ContadorEscasez,
  Etiqueta,
  FilaCarril,
  Roster,
} from "@/components/sala/piezas";

/* Una sala por visitante, nunca un tablero global compartido.
 *
 * Con una sala unica, el segundo jurado que abre la URL encuentra todo resuelto y
 * sin tension, que es justo el momento en que se evalua el proyecto. El id vive en
 * sessionStorage para que recargar caiga en la misma sala y no arranque otra. */
function usarSesion(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const previo = sessionStorage.getItem("aldaba:sesion");
    if (previo) return setId(previo);
    const nuevo = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    sessionStorage.setItem("aldaba:sesion", nuevo);
    setId(nuevo);
  }, []);
  return id;
}

export default function Pagina() {
  const sesion = usarSesion();
  const [mostrarAntes, cerrarAntes] = usarContrafactual(sesion);

  // Nunca devolver null aqui. El id de sala solo existe despues de hidratar, y si
  // el componente se vacia mientras tanto la pagina entera queda en blanco: no hay
  // cabecera, no hay esqueleto, no hay nada que indique que algo esta cargando.
  // El armazon se pinta siempre y lo unico que espera al id es el tablero.
  return (
    <>
      {/* La sala arranca detras mientras corre el contrafactual, para que al
          terminar los ocho segundos el tablero ya este vivo en vez de vacio. */}
      <Proveedor>{(identidad) => <Sala sesion={sesion} identidad={identidad} />}</Proveedor>
      {mostrarAntes && <Contrafactual onTerminar={cerrarAntes} />}
    </>
  );
}

function Sala({ sesion, identidad }: { sesion: string | null; identidad: Identidad | null }) {
  const { tablero, miCarril, decidir, reiniciar } = useSala(sesion, identidad?.id ?? null);

  const nombreDe = useMemo(() => {
    const mapa = new Map(tablero.aprobadores.map((a) => [a.id, a.nombre]));
    return (id: string) => mapa.get(id) ?? id;
  }, [tablero.aprobadores]);

  // El carril protagonista es el que le toca decidir a esta persona. Si no le toca
  // ninguno, sube el mas urgente, para que el bloque principal nunca quede vacio.
  const protagonista = useMemo(() => {
    if (miCarril) return tablero.carriles.find((c) => c.id === miCarril) ?? null;
    const esperando = tablero.carriles
      .filter((c) => c.estado === "esperando" && c.deadline != null)
      .sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0));
    return esperando[0] ?? tablero.carriles[0] ?? null;
  }, [tablero.carriles, miCarril]);

  const secundarios = tablero.carriles.filter((c) => c.id !== protagonista?.id);

  return (
    <div style={{ minHeight: "100dvh", padding: "var(--hueco-8) var(--hueco-8) var(--hueco-16)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--hueco-4)",
          paddingBottom: "var(--hueco-6)",
          borderBottom: "1px solid var(--linea)",
        }}
      >
        <AldabaLogo />
        <button
          type="button"
          onClick={() => void reiniciar()}
          style={{
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
          <ArrowsClockwise size={14} weight="light" aria-hidden />
          Reiniciar escenario
        </button>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) var(--panel-ancho-menor)",
          gap: "var(--hueco-12)",
          alignItems: "start",
          paddingTop: "var(--hueco-12)",
        }}
      >
        <div style={{ display: "grid", gap: "var(--hueco-8)" }}>
          <ContadorEscasez tablero={tablero} />

          {protagonista ? (
            <CarrilProtagonista
              carril={protagonista}
              esMio={protagonista.id === miCarril}
              nombreDe={nombreDe}
              onDecidir={(d) => void decidir(protagonista.id, d)}
            />
          ) : (
            <Esqueleto />
          )}
        </div>

        <aside style={{ display: "grid", gap: "var(--hueco-8)" }} className="surge">
          <section>
            <Etiqueta>Quién está</Etiqueta>
            <div style={{ marginTop: "var(--hueco-2)" }}>
              <Roster aprobadores={tablero.aprobadores} miId={identidad?.id ?? null} />
            </div>
          </section>

          <section>
            <Etiqueta>Otras operaciones</Etiqueta>
            <ul style={{ listStyle: "none", padding: 0, margin: "var(--hueco-2) 0 0" }}>
              {secundarios.map((c, i) => (
                <FilaCarril key={c.id} carril={c} indice={i} nombreDe={nombreDe} />
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}

/* Esqueleto mientras carga. Nunca se pinta un valor por defecto: un contador en cero
 * durante el fetch afirma algo falso sobre el dato. */
function Esqueleto() {
  return (
    <div
      aria-busy="true"
      style={{
        height: "18rem",
        border: "1px solid var(--linea)",
        borderRadius: "var(--radio)",
        background: "var(--fondo-hundido)",
      }}
    />
  );
}
