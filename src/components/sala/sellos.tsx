"use client";

/* Los sellos de los agentes.
 *
 * Cada agente tiene una forma propia, construida con el mismo vocabulario que la
 * marca: anillos, un trazo, nada mas. No son avatares ni fotos.
 *
 * Una foto de banco de imagenes le pondria cara humana a algo que no es humano, que
 * es precisamente lo que hay que evitar en un producto cuya tesis es que la decision
 * humana importa. Y ademas meteria el rostro de una persona real que no autorizo
 * nada. Un sello dibujado dice quien es sin fingir que es alguien.
 *
 * Cada forma sale del significado del nombre en quechua:
 *
 *   Kuntur  condor        el arco que vigila desde arriba
 *   Yaku    agua          la curva que vuelve sobre si misma
 *   Rumi    piedra        la barra que no cede
 *   Wayra   viento        la diagonal que desvia
 *   Ayni    reciprocidad  dos medios anillos que se devuelven
 */

type Props = { tam?: number; activo?: boolean };

function Marco({
  tam,
  activo,
  children,
}: Props & { children: React.ReactNode }) {
  const trazo = tam && tam < 30 ? 1.6 : 1.4;
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      style={{
        color: activo ? "var(--fondo-elevado)" : "var(--tinta-media)",
        flexShrink: 0,
      }}
      strokeWidth={trazo}
    >
      {children}
    </svg>
  );
}

/** Kuntur, condor. El arco que vigila desde arriba lo que sale. */
export function SelloKuntur(p: Props) {
  return (
    <Marco {...p}>
      <path d="M6 13a10 10 0 0 1 20 0" stroke="currentColor" strokeLinecap="round" />
      <circle cx="16" cy="21" r="5.5" stroke="currentColor" />
    </Marco>
  );
}

/** Yaku, agua. La curva que vuelve sobre si misma. */
export function SelloYaku(p: Props) {
  return (
    <Marco {...p}>
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" />
      <path
        d="M9 18c2.6-3 4.8 3 7.4 0s4.8-3 6.6 0"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </Marco>
  );
}

/** Rumi, piedra. La barra que no cede. */
export function SelloRumi(p: Props) {
  return (
    <Marco {...p}>
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" />
      <path d="M5 16h22" stroke="currentColor" strokeLinecap="round" strokeWidth={2.4} />
    </Marco>
  );
}

/** Wayra, viento. La diagonal que desvia. */
export function SelloWayra(p: Props) {
  return (
    <Marco {...p}>
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" />
      <path d="M6 24 26 8" stroke="currentColor" strokeLinecap="round" />
    </Marco>
  );
}

/** Ayni, reciprocidad. Dos medios anillos que se devuelven. */
export function SelloAyni(p: Props) {
  return (
    <Marco {...p}>
      <path d="M16 7.5a8.5 8.5 0 0 0 0 17" stroke="currentColor" strokeLinecap="round" />
      <path d="M16 7.5a8.5 8.5 0 0 1 0 17" stroke="currentColor" strokeLinecap="round" opacity="0.45" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </Marco>
  );
}

const SELLOS: Record<string, (p: Props) => React.ReactElement> = {
  ag_transfer: SelloKuntur,
  ag_refund: SelloYaku,
  ag_limit: SelloRumi,
  ag_fx: SelloWayra,
  ag_payroll: SelloAyni,
};

/**
 * El sello del agente dentro de su cuadrado.
 *
 * La forma sigue siendo cuadrado para maquina y circulo para persona, que es lo que
 * separa a los dos tipos de actor a distancia. El sello es lo que separa a un agente
 * de otro dentro de su propia familia.
 */
export function SelloAgente({
  id,
  tam = 26,
  alta = false,
}: {
  id: string;
  tam?: number;
  alta?: boolean;
}) {
  const Sello = SELLOS[id];

  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: tam,
        height: tam,
        flexShrink: 0,
        borderRadius: "var(--radio)",
        border: `1px solid ${alta ? "transparent" : "var(--linea-fuerte)"}`,
        background: alta ? "var(--tinta)" : "transparent",
      }}
    >
      {Sello ? <Sello tam={Math.round(tam * 0.72)} activo={alta} /> : null}
    </span>
  );
}
