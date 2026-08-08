/* La marca de Aldaba.
 *
 * Una aldaba es el llamador que cuelga de una puerta: una placa fija y un anillo que
 * pivota sobre ella para golpear. Esas dos formas son todo el simbolo, y por eso
 * sobrevive a 16px de favicon sin convertirse en una mancha.
 *
 * El anillo pivota desde donde cuelga, no desde su centro, que es como se mueve una
 * aldaba de verdad. Ese detalle es la diferencia entre un icono que gira y uno que
 * golpea. */

interface MarcaProps {
  /** Lado en px. El trazo se ajusta solo para que no desaparezca en tamanos chicos. */
  tam?: number;
  /** Anima el golpe. Se usa cuando un agente toca una puerta. */
  golpea?: boolean;
  className?: string;
}

export function AldabaMarca({ tam = 24, golpea = false, className }: MarcaProps) {
  // A tamano pequeno el trazo fino se pierde: por debajo de 20px se engorda. Es el
  // mismo motivo por el que Bricolage trae eje de optical size.
  const trazo = tam < 20 ? 2.6 : tam < 40 ? 2.2 : 1.9;

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
      {/* La placa. Fija, nunca se mueve. */}
      <rect x="8" y="2.5" width="8" height="2.6" rx="1.3" fill="currentColor" />

      {/* El anillo. Pivota desde la placa, que es de donde cuelga. */}
      <g
        style={{
          transformOrigin: "12px 4px",
          animation: golpea ? "golpe 620ms cubic-bezier(0.23, 1, 0.32, 1)" : undefined,
        }}
      >
        <path
          d="M12 5.1v2.4"
          stroke="currentColor"
          strokeWidth={trazo}
          strokeLinecap="round"
        />
        <circle cx="12" cy="14.6" r="6.1" stroke="currentColor" strokeWidth={trazo} />
      </g>
    </svg>
  );
}

/** Marca mas nombre. El nombre en versalitas con tracking abierto, que es como se
 *  comporta una firma editorial y no un logo de startup. */
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
