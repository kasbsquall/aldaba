/* Pagina interna de comparacion de marca. No va en la demo, sirve para elegir.
 *
 * Cada propuesta se ve a 96px, a 28px y a 16px, porque un logo que funciona grande
 * y se convierte en mancha a tamano de favicon no sirve. */

type Props = { tam: number };

/* 1 · Llamador. La placa fija y el anillo que cuelga. La lectura mas literal de
 * una aldaba: dos formas, nada mas. */
function Llamador({ tam }: Props) {
  const t = tam < 20 ? 2.6 : tam < 40 ? 2.2 : 1.9;
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" aria-label="Llamador">
      <rect x="8" y="2.5" width="8" height="2.6" rx="1.3" fill="currentColor" />
      <path d="M12 5.1v2.4" stroke="currentColor" strokeWidth={t} strokeLinecap="round" />
      <circle cx="12" cy="14.6" r="6.1" stroke="currentColor" strokeWidth={t} />
    </svg>
  );
}

/* 2 · Cadena. Tres anillos que decrecen: es el escalamiento dibujado. Una puerta,
 * otra puerta, otra puerta. Es la que mas cuenta lo que hace el producto. */
function Cadena({ tam }: Props) {
  const t = tam < 22 ? 2.4 : tam < 44 ? 2.1 : 1.9;
  const compacto = tam < 26;
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" aria-label="Cadena">
      <circle cx="7.6" cy="12" r="5.4" stroke="currentColor" strokeWidth={t} />
      {compacto ? (
        <circle cx="16.6" cy="12" r="2.1" fill="currentColor" />
      ) : (
        <circle cx="16.6" cy="12" r="3.2" stroke="currentColor" strokeWidth={t} />
      )}
      <circle cx="21.6" cy="12" r={compacto ? 1.1 : 1.4} fill="currentColor" />
    </svg>
  );
}

/* 3 · Golpe. El anillo con el arco del impacto a un lado. Congela el instante en
 * que la aldaba toca la madera. */
function Golpe({ tam }: Props) {
  const t = tam < 20 ? 2.5 : tam < 40 ? 2.1 : 1.9;
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" aria-label="Golpe">
      <circle cx="10" cy="12" r="6.4" stroke="currentColor" strokeWidth={t} />
      <path d="M19 8.4a7.4 7.4 0 0 1 0 7.2" stroke="currentColor" strokeWidth={t} strokeLinecap="round" />
      <path d="M22.4 6a11 11 0 0 1 0 12" stroke="currentColor" strokeWidth={t} strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/* 4 · Umbral. La puerta y el anillo dentro. Es la mas "producto" y la que mejor
 * aguanta puesta sobre un fondo oscuro como marca de aplicacion. */
function Umbral({ tam }: Props) {
  const t = tam < 20 ? 2.4 : tam < 40 ? 2 : 1.8;
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" aria-label="Umbral">
      <path
        d="M4.5 21V9.2a7.5 7.5 0 0 1 15 0V21"
        stroke="currentColor"
        strokeWidth={t}
        strokeLinecap="round"
      />
      <circle cx="12" cy="13.4" r="3.5" stroke="currentColor" strokeWidth={t} />
    </svg>
  );
}

const PROPUESTAS = [
  { n: 1, nombre: "Llamador", Marca: Llamador, nota: "La lectura literal. Placa fija y anillo que cuelga y pivota." },
  { n: 2, nombre: "Cadena", Marca: Cadena, nota: "El escalamiento dibujado: una puerta, otra puerta, otra puerta." },
  { n: 3, nombre: "Golpe", Marca: Golpe, nota: "El instante del impacto, con la onda saliendo del anillo." },
  { n: 4, nombre: "Umbral", Marca: Umbral, nota: "La puerta con el anillo dentro. La más producto." },
];

export default function PaginaMarca() {
  return (
    <div style={{ padding: "var(--hueco-12) var(--hueco-8)" }}>
      <h1 style={{ fontSize: "var(--paso-4)", marginBottom: "var(--hueco-2)" }}>
        Cuatro propuestas de marca
      </h1>
      <p style={{ color: "var(--tinta-media)", marginBottom: "var(--hueco-12)", maxWidth: "34rem" }}>
        Cada una a 96, 28 y 16 píxeles. El de 16 es el que decide: un símbolo que a
        tamaño de favicon se convierte en mancha no sirve, por bien que se vea grande.
      </p>

      <div style={{ display: "grid", gap: "var(--hueco-12)" }}>
        {PROPUESTAS.map(({ n, nombre, Marca, nota }) => (
          <section
            key={n}
            style={{
              display: "grid",
              gridTemplateColumns: "7rem 1fr",
              gap: "var(--hueco-8)",
              alignItems: "center",
              paddingBottom: "var(--hueco-8)",
              borderBottom: "1px solid var(--linea)",
            }}
          >
            <div>
              <div
                className="dato"
                style={{ fontSize: "var(--paso-5)", fontWeight: 600, lineHeight: 1 }}
              >
                {n}
              </div>
              <div
                style={{
                  fontSize: "var(--paso--1)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--tinta-tenue)",
                  marginTop: "var(--hueco-2)",
                }}
              >
                {nombre}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--hueco-12)" }}>
              <div style={{ color: "var(--tinta)" }}>
                <Marca tam={96} />
              </div>

              <div style={{ display: "grid", gap: "var(--hueco-4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--hueco-4)" }}>
                  <Marca tam={28} />
                  <Marca tam={16} />
                  <span style={{ fontSize: "var(--paso--1)", color: "var(--tinta-tenue)" }}>
                    28px · 16px
                  </span>
                </div>

                {/* Sobre fondo oscuro, que es como vive un favicon en la mayoria de
                    navegadores y como se veria en una galeria. */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--hueco-4)",
                    background: "var(--hueso-900)",
                    color: "var(--hueso-50)",
                    padding: "var(--hueco-3) var(--hueco-4)",
                    borderRadius: "var(--radio)",
                    width: "fit-content",
                  }}
                >
                  <Marca tam={28} />
                  <Marca tam={16} />
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
                </div>

                <p style={{ fontSize: "var(--paso-0)", color: "var(--tinta-media)", margin: 0 }}>
                  {nota}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
