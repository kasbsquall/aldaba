# Pendientes

## Resuelto · El tablero no se poblaba

Era un **desajuste de hidratacion**, y tardo en aparecer porque no se manifestaba
como un error visible sino como una pagina muerta.

`usarContrafactual` leia `sessionStorage` durante el render para decidir si mostrarse.
En el servidor no hay `sessionStorage`, asi que el servidor pintaba una cosa y el
cliente otra. React detecta la diferencia, descarta el arbol y lo regenera, y en ese
descarte se pierden los efectos del componente de pagina. De ahi el sintoma raro que
costo diagnosticar: los efectos del hijo (`Proveedor`) corrian y los del padre no, asi
que `/api/portal-token` se llamaba y `/api/sesion` nunca.

La correccion tiene dos partes. El contrafactual arranca visible siempre, tambien en
el servidor, y se cierra despues en un efecto si esa sala ya lo vio: asi servidor y
cliente pintan lo mismo en el primer render. Y el id de sala se calcula con un
inicializador perezoso en vez de un efecto, que ademas lo hace inmune a este fallo.

Leccion para el resto del proyecto: leer `sessionStorage`, `localStorage` o
`window` durante el render de un componente que el servidor tambien pinta rompe la
hidratacion, y el sintoma puede aparecer muy lejos de la causa.

## Abiertos

- El aside deja un vacio grande abajo a la derecha. Se lee como inacabado.
- Sin probar en movil ni en 768px.
- El item de inbox llega sin titulo, lo que sugiere que se recibe el item del envio
  dirigido y no el descriptor del puente `notify`.
- Falta el despliegue con URL estable, las tres auditorias por subagente, el video,
  el README y el pitch de 200 caracteres.
