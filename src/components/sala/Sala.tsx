"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { AldabaLogo } from "@/components/marca/Aldaba";
import { Proveedor, type Identidad } from "@/app/providers";
import { SALA } from "@/lib/cast";
import { useSala } from "@/components/sala/useSala";
import { Contrafactual, usarContrafactual } from "@/components/sala/Contrafactual";
import { AvisoDeToque } from "@/components/sala/aviso";
import { useReordenar } from "@/components/sala/reordenar";
import { FranjaPlazos } from "@/components/sala/franja";
import {
  Arbitraje,
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
  // Una sola sala publica. Antes era una por visitante, y eso apagaba lo unico que
  // ninguna otra tecnologia da: que dos personas que abren la URL a la vez se vean,
  // se cuenten en el mismo roster y compitan por la misma atencion.
  return SALA;
}

function _usarSesionAntigua(): string | null {
  // El id se calcula durante el primer render del cliente, no en un efecto.
  //
  // Derivarlo de un efecto lo dejaba en null indefinidamente: el componente
  // renderizaba en el cliente pero su efecto no llegaba a correr, asi que
  // `/api/sesion` no se disparaba nunca y el tablero se quedaba vacio para
  // siempre. Con un inicializador perezoso el valor existe ya en el primer
  // render, sin depender de que nada se ejecute despues.
  //
  // En el servidor devuelve null porque sessionStorage no existe alli, y eso no
  // produce desajuste de hidratacion: en el primer pintado la sala todavia no
  // tiene mensajes, asi que servidor y cliente dibujan el mismo esqueleto.
  const [id] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const previo = sessionStorage.getItem("aldaba:sesion");
    if (previo) return previo;
    const nuevo = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    sessionStorage.setItem("aldaba:sesion", nuevo);
    return nuevo;
  });
  return id;
}

export default function Sala() {
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
      <Proveedor>{(identidad) => <Tablero sesion={sesion} identidad={identidad} />}</Proveedor>
      {mostrarAntes && <Contrafactual onTerminar={cerrarAntes} />}
    </>
  );
}

function Tablero({ sesion, identidad }: { sesion: string | null; identidad: Identidad | null }) {
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

  const secundarios = useMemo(() => {
    const rango = (c: (typeof tablero.carriles)[number]) => {
      if (c.estado === "esperando" && c.deadline != null) return 0;
      if (c.estado === "esperando") return 1;
      if (c.estado === "trabajando") return 2;
      return 3;
    };
    return tablero.carriles
      .filter((c) => c.id !== protagonista?.id)
      .sort((a, b) => rango(a) - rango(b) || (a.deadline ?? Infinity) - (b.deadline ?? Infinity));
  }, [tablero.carriles, protagonista?.id]);

  const listaOperaciones = useReordenar<HTMLUListElement>();

  return (
    <div className="pagina">
      <AvisoDeToque
        carril={miCarril}
        operacion={tablero.carriles.find((c) => c.id === miCarril)?.operacion ?? null}
      />
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

      <main className="sala">
        <div className="columna-principal">
          <div className="apertura">
            {/* La cifra y la prosa que la explica viven dentro de la misma losa. Antes
                eran dos bloques sueltos y el contador flotaba sin nada que lo anclara. */}
            <section className="losa surge">
              <ContadorEscasez tablero={tablero} sobreTinta />
              <p className="prosa-losa">
                Cinco agentes necesitan una firma humana para seguir. En vez de esperar,
                cada uno busca quién está libre en este momento y le toca la puerta. Si
                nadie abre dentro del plazo, escala solo a la siguiente persona.
              </p>
            </section>

            <FranjaPlazos tablero={tablero} protagonistaId={protagonista?.id ?? null} />
          </div>

          <div className="tablero">
            <Arbitraje arbitraje={tablero.arbitraje} />

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
        </div>

        <aside className="panel surge">
          <section>
            <Etiqueta>Quién está disponible</Etiqueta>
            <div style={{ marginTop: "var(--hueco-2)" }}>
              <Roster aprobadores={tablero.aprobadores} miId={identidad?.id ?? null} />
            </div>
          </section>

          <section>
            <Etiqueta>Otras operaciones</Etiqueta>
            <ul
              ref={listaOperaciones}
              style={{ listStyle: "none", padding: 0, margin: "var(--hueco-2) 0 0" }}
            >
              {secundarios.map((c, i) => (
                <FilaCarril key={c.id} carril={c} indice={i} nombreDe={nombreDe} />
              ))}
            </ul>
          </section>

          <section
            style={{
              borderTop: "1px solid var(--linea)",
              paddingTop: "var(--hueco-3)",
              fontSize: "var(--paso--1)",
              color: "var(--tinta-tenue)",
              lineHeight: 1.6,
            }}
          >
            <Etiqueta>Cómo escala</Etiqueta>
            <p style={{ margin: "var(--hueco-2) 0 0" }}>
              Cada puerta tiene entre 18 y 30 segundos según la severidad de la
              operación. Al vencer, el agente toca a la siguiente persona disponible.
              Agotadas las tres, la operación queda retenida y no se ejecuta.
            </p>
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
