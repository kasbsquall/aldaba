/* La marca de Aldaba: la cadena.
 *
 * Tres anillos que decrecen hacia la derecha. Es lo unico que hace el producto,
 * dibujado: una puerta, otra puerta, otra puerta. El primero es el toque que
 * ocurre ahora; los dos siguientes son las puertas que vienen si nadie abre.
 *
 * A tamano chico los anillos menores colapsan a puntos solidos. Un anillo de radio
 * pequeno con trazo grueso deja un hueco de dos pixeles que a 16px se cierra solo y
 * termina viendose como una mancha sucia. Un punto solido a ese tamano se lee
 * limpio y cuenta lo mismo. Por eso no se usa opacidad para jerarquizar: a tamano
 * de favicon el degradado hunde el tercer anillo hasta desaparecerlo. */

interface MarcaProps {
  /** Lado en px. */
  tam?: number;
  /** Anima el escalamiento: los anillos se encienden en secuencia. */
  golpea?: boolean;
  className?: string;
}

export function AldabaMarca({ tam = 24, golpea = false, className }: MarcaProps) {
  // Por debajo de 22px el trazo fino se pierde contra el fondo y hay que engordarlo.
  const trazo = tam < 22 ? 2.4 : tam < 44 ? 2.1 : 1.9;
  // Umbral donde el anillo medio deja de tener hueco util.
  const compacto = tam < 26;

  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Aldaba"
    >
      {/* El toque que ocurre ahora. Siempre anillo, a cualquier tamano. */}
      <circle
        cx="7.6"
        cy="12"
        r="5.4"
        stroke="currentColor"
        strokeWidth={trazo}
        style={golpea ? { animation: "cadena 900ms var(--curva-entrada) both" } : undefined}
      />

      {/* La segunda puerta. */}
      {compacto ? (
        <circle cx="16.6" cy="12" r="2.1" fill="currentColor" />
      ) : (
        <circle cx="16.6" cy="12" r="3.2" stroke="currentColor" strokeWidth={trazo} />
      )}

      {/* La tercera. Siempre punto: es la que menos pesa y la que mas lejos esta. */}
      <circle
        cx="21.6"
        cy="12"
        r={compacto ? 1.1 : 1.4}
        fill="currentColor"
        style={
          golpea
            ? { animation: "cadena 900ms var(--curva-entrada) both", animationDelay: "220ms" }
            : undefined
        }
      />
    </svg>
  );
}

/** Marca mas nombre. El nombre en versalitas con tracking abierto, que se comporta
 *  como una firma editorial y no como un logo de startup. */
export function AldabaLogo({ tam = 22 }: { tam?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--hueco-2)",
        color: "var(--tinta)",
      }}
    >
      <AldabaMarca tam={tam} />
      <span
        style={{
          fontFamily: "var(--fuente-voz)",
          fontSize: "var(--paso-0)",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Aldaba
      </span>
    </span>
  );
}
