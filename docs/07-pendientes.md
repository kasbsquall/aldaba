# Pendientes

## Resuelto · el tablero no se poblaba

La causa era una premisa falsa del diseno, no un bug de codigo.

**En este entorno Portal entrega en vivo pero no persiste.** El historial de un canal
vuelve siempre vacio y todo envio resuelve con `seq: undefined`. Comprobado con tipos
con punto, con guion bajo y sin prefijo, y tambien en un canal sin configuracion
alguna, asi que no es el `authz`, ni el `notify`, ni el prefijo de namespace.

Por eso el cliente de Node veia todo (esta conectado en vivo desde antes) y el
navegador no veia nada: llega un segundo tarde, pide el historial, recibe cero, y ya
no hay forma de recuperar lo que se perdio.

La correccion es dejar de usar el canal como fuente de verdad. El orquestador ya
tenia el estado en memoria; ahora lo devuelve como foto en la misma respuesta de
`POST /api/sesion`, y el cliente aplica los mensajes en vivo encima de esa base. El
canal sigue siendo el transporte; deja de ser el almacen.

Verificado en produccion con sala nueva: tablero poblado, contador en 2 disponibles
frente a 5 esperando, el clic llega al boton, el veredicto se registra, el contador
baja a 4 y el siguiente carril sube al bloque protagonista.

## Abiertos, por prioridad

### Obligatorios del reglamento
- Video de 90 segundos. Grabarlo el sabado de noche, nunca el domingo.
- README con la explicacion de como se uso Portal.
- Pitch de 200 caracteres.
- Enviar el formulario. Empezar a las 9:00 como muy tarde.

### Alto
- A 375px la columna protagonista mide 0px y hay scroll horizontal.
- Textos que mienten: `ap_visitante` crudo en pantalla, "firmada por Tu", y el
  razonamiento afirmando que "312 clientes afectados no tiene historial previo".
- El contador dice "disponibles" pero cuenta conectados, y la tesis del producto es
  justamente que estar presente no es estar disponible.

### Medio
- El rojo significa tres cosas: escasez, puerta actual y plazo.
- Botones con dos estados de seis. Sin hover, sin disabled, sin loading.
- Doble envio posible en Firmar.
- Bricolage importada sin su eje de optical size, que era la razon de elegirla.
- Dos rechazos sueltos de `message rejected by moderation` en el log, sin patron
  claro. No bloquean, pero conviene saber que existen.
