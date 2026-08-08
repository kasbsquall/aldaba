"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { notionistsNeutral } from "@dicebear/collection";

/* Retratos de las personas.
 *
 * Los agentes llevan sello dibujado y las personas llevan cara. Esa asimetria es
 * deliberada: darle rostro humano a un agente seria disfrazar de persona algo que
 * no lo es, en un producto cuya tesis es que la decision humana importa. Pero un
 * aprobador SI es una persona, y dos iniciales sueltas no son una identidad.
 *
 * Se generan con DiceBear, que es open source y corre como libreria: el SVG se
 * construye en el cliente a partir del nombre, sin peticion a ningun servicio, sin
 * clave de API y sin depender de que un tercero siga en pie el domingo. El mismo
 * nombre da siempre el mismo rostro, asi que M. Rivas es reconocible entre pantallas
 * y entre sesiones.
 *
 * El estilo es de trazo, sin color de piel ni ropa, para que conviva con una
 * direccion editorial en escala de grises calida en vez de meter cinco manchas de
 * color saturado en un panel que tiene un solo acento. */

export function Retrato({
  nombre,
  tam = 26,
  atenuado = false,
}: {
  nombre: string;
  tam?: number;
  atenuado?: boolean;
}) {
  const uri = useMemo(
    () =>
      createAvatar(notionistsNeutral, {
        seed: nombre,
        size: tam * 2,
        radius: 50,
        backgroundColor: ["f2ede4"],
        scale: 108,
      }).toDataUri(),
    [nombre, tam]
  );

  return (
    <img
      src={uri}
      alt=""
      aria-hidden
      width={tam}
      height={tam}
      style={{
        width: tam,
        height: tam,
        flexShrink: 0,
        borderRadius: "50%",
        border: `1px solid ${atenuado ? "var(--linea)" : "var(--linea-fuerte)"}`,
        // Fuera de linea el retrato se apaga en vez de desaparecer: sigue siendo la
        // misma persona, solo que no esta.
        filter: atenuado ? "grayscale(1) opacity(0.45)" : "grayscale(1)",
        transition: "filter var(--dur-ui)",
      }}
    />
  );
}
