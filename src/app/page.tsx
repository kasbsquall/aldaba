"use client";

import dynamic from "next/dynamic";

// La sala se renderiza solo en el cliente, a proposito.
//
// Su estado sale de sessionStorage y de una conexion WebSocket, cosas que no
// existen en el servidor. Renderizarla en ambos lados producia un desajuste de
// hidratacion, y ese desajuste hacia que React descartara el arbol y perdiera por
// el camino los efectos y las actualizaciones de estado del componente de pagina:
// el overlay de apertura no se cerraba nunca y la sala no llegaba a arrancar.
//
// Marcarla como cliente puro elimina la clase entera de fallo en vez de perseguir
// cada sintoma. El coste es que no hay HTML servido para esta ruta, que aqui no
// importa porque no es contenido indexable.
const Sala = dynamic(() => import("@/components/sala/Sala"), {
  ssr: false,
  loading: () => null,
});

export default function Pagina() {
  return <Sala />;
}
