# Entrega

Formulario: https://usehack.useportal.co/terms
Cierra el domingo 9 de agosto a las 10:00 hora de Lima. Empezar a llenarlo a las 9:00.

## Campos

**Nombre del equipo:** Kevin Soto Burgos

**Integrantes:** Kevin Soto Burgos

**Usuario de Discord:** (completar)

**Pitch del producto**, 200 caracteres o menos. Es lo primero que leen.

Opción A, 172 caracteres. La más directa al problema:

> Los agentes de IA se congelan esperando aprobación humana. Aldaba invierte eso: el
> agente busca quién está libre ahora mismo, le toca la puerta y escala solo si nadie
> abre.

Opción D, 184 caracteres. Abre con una cifra concreta y cierra con el contraste de
tiempo, que es lo que se recuerda:

> Tu agente de IA lleva 4 horas esperando una firma. Aldaba busca quién está libre
> ahora mismo, le toca la puerta y escala solo si nadie abre. El agente reanuda en
> segundos, no en horas.

Opción B, 182 caracteres. La única que nombra Portal, por si conviene:

> Cinco agentes, dos personas libres. Aldaba enruta cada aprobación a quien está
> realmente disponible en este segundo, y escala sola cuando nadie abre. Presencia en
> vivo, sobre Portal.

**Producto desplegado:** https://aldaba.107-172-6-206.sslip.io

**Demo grabada:** máximo 1 minuto 30. YouTube, Loom o Screen Studio.

**Repositorio:** https://github.com/kasbsquall/aldaba

**Cómo se usó Portal.** Directo al grano, que fue lo que pidieron. Base sugerida:

> Portal es el sustrato donde conviven los agentes y las personas, no el transporte de
> una app de humanos. El orquestador lee `room.presence` del canal cada vez que tiene
> que decidir a quién pedirle una firma, y ordena la cadena en conectado y libre,
> conectado pero ocupado, y ausente. El toque viaja como mensaje público al canal para
> que el tablero vea la cadena completa, y un puente `notify` en `portal.config.ts`
> dirige la notificación al inbox de una sola persona, así que le llega aunque no esté
> mirando el canal. La autorización y la membresía se declaran server-side con
> `access: "authz"`. Como el inbox rechaza tokens anónimos, Aldaba firma sus propios
> JWT y publica su JWKS para que Portal los verifique.
>
> Lo más difícil fueron tres cosas que no están documentadas y salieron probando. Con
> `anonymous: false` y sin `access` explícito el canal cae en `"membership"`, y ahí un
> envío dirigido a alguien sin fila falla con `not_member`: el valor que parece seguro
> es el que rompe el escalamiento. El alta de miembros existe en
> `POST /v1/channels/{id}/members` pero no está publicada. Y en nuestro entorno los
> mensajes no persistieron: el historial vuelve siempre vacío y todo envío resuelve
> con `seq: undefined`, comprobado también en un canal sin configuración alguna, así
> que un cliente que llega un segundo tarde no puede recuperar nada. Lo resolvimos
> devolviendo una foto del estado desde el servidor y aplicando lo que llega en vivo
> encima.

## Guion del video, 90 segundos

- **0:00 a 0:10** · El contrafactual. El cronómetro subiendo sin techo. "Así funciona
  hoy: un agente pide permiso y se queda esperando."
- **0:10 a 0:25** · El tablero. Señalar el contador: dos personas libres, cinco
  operaciones esperando una firma. Es el número que resume el problema.
- **0:25 a 0:45** · Un carril concreto. El razonamiento del agente, la regla que lo
  detuvo, y el reloj corriendo. Que se vea que la decisión llega con contexto.
- **0:45 a 1:05** · No hacer nada. Dejar que un plazo venza y mostrar la cadena:
  "M. Rivas no abrió", y la puerta salta a la siguiente persona. Este es el momento
  del video.
- **1:05 a 1:20** · Firmar. El agente reanuda al instante y la siguiente operación
  sube al bloque principal.
- **1:20 a 1:30** · Cierre: ningún framework sabe quién está disponible. Portal sí, y
  por eso esto solo se puede construir aquí.

Recordar: pidieron ver a la persona usando y explicando el producto, no una
presentación ni métricas de negocio.

## Antes de enviar

- [ ] Abrir la URL en incógnito y confirmar que el escenario arranca solo
- [ ] Probarlo en el teléfono
- [ ] Ver que el repositorio es público y tiene licencia
- [ ] Dejar el video en un enlace accesible sin permisos
