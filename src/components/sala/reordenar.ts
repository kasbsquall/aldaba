"use client";

import { useLayoutEffect, useRef } from "react";

/* Reordenamiento animado de la lista de operaciones, con FLIP.
 *
 * La columna estrecha se reordena sola: cuando un carril cierra o cambia de estado,
 * las filas cambian de sitio. Hasta ahora saltaban, y un salto no comunica que algo
 * se movio, comunica que la pantalla se redibujo. Con la animacion, el usuario ve
 * QUE subio y QUE bajo, que es la mitad del argumento de un tablero en vivo.
 *
 * FLIP y no una libreria de layout: mide la posicion antes del repintado, mide
 * despues, aplica la diferencia invertida y la suelta. Anima solo `transform`, asi
 * que no toca layout ni provoca reflow por fotograma, y no arrastra dependencias.
 *
 * La alternativa era `view-transition-name`, que es mas elegante y tiene menos
 * soporte. Con un jurado abriendo la URL en el navegador que le de la gana, la
 * tecnica aburrida que funciona en todos gana a la elegante que funciona en algunos.
 */

const DURACION = 320;

export function useReordenar<T extends HTMLElement>() {
  const contenedor = useRef<T>(null);
  const posiciones = useRef(new Map<string, number>());

  // Sin lista de dependencias a proposito: mide en cada render. Una fila puede
  // cambiar de alto sin cambiar de sitio (un carril gana una linea de texto), y si
  // solo midieramos al reordenar, la medida guardada quedaria vieja y el siguiente
  // movimiento arrancaria desde una posicion que ya no existe. Son cuatro filas.
  useLayoutEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;

    // Respetar la preferencia del sistema: quien pide menos movimiento recibe el
    // reordenamiento instantaneo, no una version suave del mismo movimiento.
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hijos = Array.from(raiz.querySelectorAll<HTMLElement>("[data-clave]"));
    const nuevas = new Map<string, number>();

    for (const hijo of hijos) {
      const clave = hijo.dataset.clave;
      if (!clave) continue;

      const arriba = hijo.getBoundingClientRect().top;
      nuevas.set(clave, arriba);

      if (quieto) continue;

      const antes = posiciones.current.get(clave);
      // Una fila nueva no se anima desde ningun sitio: no estaba, no se movio.
      if (antes === undefined) continue;

      const delta = antes - arriba;
      if (Math.abs(delta) < 2) continue;

      hijo.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: "none" }],
        { duration: DURACION, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
    }

    posiciones.current = nuevas;
  });

  return contenedor;
}
