import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aldaba · el agente que toca puertas hasta que alguien abre",
  description:
    "Los agentes de IA se congelan esperando aprobación humana. Aldaba invierte eso: el agente busca quién está disponible ahora, escala si nadie responde, y retoma en vivo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
