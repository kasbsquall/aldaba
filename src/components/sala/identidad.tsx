"use client";

import { AldabaMarca } from "@/components/marca/Aldaba";

/* Identidad visual de los actores.
 *
 * La distincion es de FORMA, no de color: cuadrado es maquina, circulo es persona.
 * Una diferencia de forma sobrevive a la compresion de video y a mirar la pantalla
 * de lejos; una diferencia de color no, y ademas romperia la regla del acento unico
 * que gobierna toda la direccion.
 *
 * La severidad se codifica por masa de tinta, no por matiz: alta va rellena, media
 * va en contorno. Asi los cinco agentes no caen en el patron de cinco objetos
 * identicos en columna, que la direccion lista como prohibido. */

const MONOGRAMA: Record<string, string> = {
  ag_transfer: "PA",
  ag_refund: "RE",
  ag_limit: "LI",
  ag_fx: "FX",
  ag_payroll: "PL",
};

/** Dos letras que se distingan entre si a distancia, no las dos primeras del nombre. */
export function siglaDeAgente(id: string, nombre: string): string {
  return MONOGRAMA[id] ?? nombre.replace(/[^A-Za-zÁÉÍÓÚÑ]/g, "").slice(0, 2).toUpperCase();
}

export function siglaDePersona(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

/** El agente: cuadrado. Relleno si su operacion es de severidad alta. */
export function MarcaAgente({
  id,
  nombre,
  tam = 26,
  alta = false,
}: {
  id: string;
  nombre: string;
  tam?: number;
  alta?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: tam,
        height: tam,
        flexShrink: 0,
        borderRadius: "var(--radio)",
        border: `1px solid ${alta ? "transparent" : "var(--linea-fuerte)"}`,
        background: alta ? "var(--tinta)" : "transparent",
        color: alta ? "var(--fondo-elevado)" : "var(--tinta-media)",
        fontFamily: "var(--fuente-dato)",
        fontSize: Math.max(9, Math.round(tam * 0.38)),
        fontWeight: 500,
        letterSpacing: "0.06em",
        lineHeight: 1,
      }}
    >
      {siglaDeAgente(id, nombre)}
    </span>
  );
}

/** La persona: circulo, siempre en contorno. Nunca se rellena, para que la forma
 *  siga siendo lo que distingue y el peso no compita con la severidad del agente. */
export function MarcaPersona({
  nombre,
  tam = 26,
  atenuada = false,
}: {
  nombre: string;
  tam?: number;
  atenuada?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: tam,
        height: tam,
        flexShrink: 0,
        borderRadius: "50%",
        border: `1px solid ${atenuada ? "var(--linea)" : "var(--linea-fuerte)"}`,
        color: atenuada ? "var(--tinta-tenue)" : "var(--tinta-media)",
        fontFamily: "var(--fuente-dato)",
        fontSize: Math.max(9, Math.round(tam * 0.36)),
        fontWeight: 500,
        letterSpacing: "0.04em",
        lineHeight: 1,
      }}
    >
      {siglaDePersona(nombre)}
    </span>
  );
}

/* El plano de puertas. El logotipo usado como estructura de datos.
 *
 * Tres anillos con la geometria de la marca. Sin tocar va al 25% de alfa, tocada y
 * vencida va rellena en gris, y la que se esta tocando ahora va a trazo completo con
 * un punto dentro que se pone rojo cuando el plazo apremia.
 *
 * El escalamiento es lo unico que este producto tiene y ningun otro va a mostrar, y
 * asi deja de ser texto para ser una forma que cambia sola. */
export function PlanoDePuertas({
  cadena,
  apremia = false,
  tam = 11,
}: {
  cadena: { vencio: boolean }[];
  apremia?: boolean;
  tam?: number;
}) {
  const total = 3;
  const activa = cadena.length - 1;

  return (
    <span
      aria-hidden
      style={{ display: "inline-flex", gap: Math.round(tam * 0.55), alignItems: "center" }}
    >
      {Array.from({ length: total }, (_, i) => {
        const tocada = i < cadena.length;
        const vencida = tocada && cadena[i]?.vencio;
        const esActiva = i === activa && !vencida;

        return (
          <svg key={i} width={tam} height={tam} viewBox="0 0 12 12" fill="none">
            <circle
              cx="6"
              cy="6"
              r="4.6"
              stroke={
                !tocada
                  ? "color-mix(in oklch, var(--hueso-900) 25%, transparent)"
                  : vencida
                    ? "var(--tinta-tenue)"
                    : "var(--tinta)"
              }
              strokeWidth={esActiva ? 1.8 : 1.3}
              fill={vencida ? "var(--tinta-tenue)" : "none"}
            />
            {esActiva && (
              <circle cx="6" cy="6" r="1.6" fill={apremia ? "var(--urgente)" : "var(--tinta)"} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

/* La filigrana. La marca a gran tamano, sangrada por el borde, casi invisible.
 *
 * Convierte la tarjeta de componente web en hoja con membrete, que es la promesa
 * editorial que la direccion declara y que hasta ahora no se cumplia en ninguna
 * superficie. Al 5% de tinta no compite con el texto; por encima del 8% ensucia la
 * lectura del razonamiento. */
export function Filigrana({ tam = 340 }: { tam?: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        right: -Math.round(tam * 0.26),
        top: "50%",
        transform: "translateY(-50%)",
        color: "color-mix(in oklch, var(--hueso-900) 5%, transparent)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <AldabaMarca tam={tam} />
    </span>
  );
}

/* El sello de acta.
 *
 * Le da un momento de pago visible a la unica accion que el visitante ejecuta, y el
 * contraste entre sello solido y sello discontinuo cuenta el desenlace sin leer una
 * palabra. Rotacion minima y linea de 1px: pasado de ahi se vuelve decoracion. */
export function SelloDeActa({
  texto,
  firme = true,
}: {
  texto: string;
  firme?: boolean;
}) {
  return (
    <span
      className="sello"
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "var(--radio)",
        border: `1px ${firme ? "solid" : "dashed"} ${
          firme ? "var(--resuelto)" : "var(--tinta-tenue)"
        }`,
        color: firme ? "var(--resuelto)" : "var(--tinta-tenue)",
        fontFamily: "var(--fuente-dato)",
        fontSize: 9,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </span>
  );
}
