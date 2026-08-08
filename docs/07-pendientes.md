# Pendientes

## BLOQUEANTE · El tablero no se puebla

**Sintoma.** La sala carga el armazon (cabecera, marca, esqueletos) pero el tablero
se queda vacio para siempre. El contrafactual tampoco aparece.

**Lo que ya se descarto:**

- No es la hidratacion ni los efectos en general. `GET /api/portal-token` aparece en
  el log del servidor en cada carga, y ese fetch vive en un `useEffect` de
  `Proveedor`, o sea que el cliente hidrata y ejecuta efectos.
- No hay errores en consola, ni de React ni de red.
- No es el contrafactual: el sintoma existia antes de agregarlo. Se introdujo con el
  cambio de sala por visitante.

**Lo que apunta al problema.** `GET /api/sesion` NO aparece nunca en el log. Ese
fetch vive en `useSala` y esta condicionado a que `sesionId` no sea nulo. Los dos
hooks que fallan (`usarSesion` y `usarContrafactual`) viven en el componente
`Pagina`, y el que si funciona (`Proveedor`) es un hijo. Eso sugiere que los efectos
de `Pagina` no estan corriendo o estan fallando en silencio, mientras los de sus
hijos si.

**Por donde seguir, en orden:**

1. Poner un `console.log` dentro del efecto de `usarSesion` y confirmar si entra.
2. Si no entra, revisar si algo antes en el arbol esta suspendiendo `Pagina`.
3. Si entra pero `setId` no re-renderiza, sospechar de `if (previo) return setId(previo)`:
   devolver el resultado de un setter desde un efecto es legal pero confuso, y
   conviene separarlo en dos lineas para descartarlo.
4. Alternativa que evita el problema entero: generar el id de sala en el servidor y
   pasarlo como prop desde un Server Component, en vez de derivarlo de
   sessionStorage despues de hidratar.

## Otros, no bloqueantes

- El aside deja un vacio grande abajo a la derecha. Se lee como inacabado.
- Sin probar en movil ni en 768px.
- El item de inbox llega sin titulo, lo que sugiere que se esta recibiendo el item
  del envio dirigido y no el descriptor del puente `notify`.
- Falta el despliegue con URL estable, las tres auditorias por subagente, el video,
  el README y el pitch de 200 caracteres.
