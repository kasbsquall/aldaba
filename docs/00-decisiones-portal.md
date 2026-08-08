# Decisiones de arquitectura sobre Portal

Escrito el jueves 6 de agosto de 2026, antes de que abra la ventana de commits
(viernes 7, 19:00 hora de Lima). Este archivo vive fuera del repo hasta entonces.

Cada decisión lleva el sustento verificado contra la documentación de Portal
(`docs.useportal.co`, texto completo de 3093 líneas) y contra los paquetes publicados
en npm (`@portalsdk/core@0.1.5`, `@portalsdk/config@0.2.1`, `@portalsdk/cli@0.5.5`,
`@portalsdk/wire-protocol@0.3.0`). Lo que no pude verificar está marcado como supuesto.

---

## D1. No existe una primitiva de ejecuciones de agente

La palabra "agent" aparece cero veces en la documentación completa. La firma
`portal.emit('agent:run', {...})` que circulaba en material previo no corresponde a
ninguna API real. Lo que la landing de Portal llama "AI Agent Execution" es una
descripción de caso de uso sobre canales, no un endpoint.

**Decisión.** El streaming del razonamiento del agente se implementa como mensajes de
canal con tipos propios namespaced bajo `aldaba.`. Ver `01-vocabulario-mensajes.md`.

**Consecuencia para la demo.** Esto conviene decirlo en el README y en el formulario:
Aldaba no consume una función de conveniencia, construye la mecánica sobre las
primitivas de Portal. Es un argumento a favor, no en contra.

---

## D2. Razonamiento efímero, hitos persistentes

Portal distingue dos tipos de envío. Los efímeros no se almacenan, no tienen `seq`, no
aparecen en el historial y no se entregan por webhook. Los persistentes reciben un `seq`
por canal y los recupera cualquiera que se conecte después.

**Decisión.** El razonamiento continuo del agente va efímero. Los hitos van persistentes.

**El motivo real es la demo.** El jurado va a abrir la URL desplegada cuando el caso ya
esté corriendo, o va a recargar la página. Si la cadena de escalamiento fuera efímera,
llegarían a una pantalla vacía. Todo lo que la vista del observador necesita mostrar
tiene que sobrevivir a un refresh, y eso obliga a que sea persistente.

Además el puente `notify` produce un `InboxItem` con estado de leído propio e
idempotency key, o sea que necesita persistencia. Un knock efímero no puede generar
notificación.

---

## D3. Techo de 2KB por mensaje

El envelope del protocolo define `content` como opaco y menor o igual a 2KB.

**Decisión.** El razonamiento se trocea en pasos cortos. Nada de volcar un bloque largo
de texto del modelo en un solo `send`. Si un paso se pasa, se recorta con marca de
truncado en el propio payload.

---

## D4. Un canal por caso

Formato: `aldaba-case-{caseId}`. En `portal.config.ts` se declara como `aldaba-case-*`,
que la documentación resuelve por prefijo fijo más largo.

**Por qué uno por caso y no uno global.** El puente `notify` se declara por canal, la
presencia se mide por canal, y el historial que carga la vista del observador es el del
canal. Un canal por caso hace que las tres cosas coincidan sin filtrar nada a mano.

---

## D5. El knock es un mensaje dirigido, no una llamada a una API de notificaciones

No existe un endpoint tipo "notificar a fulano". El mecanismo es declarativo: se publica
en el canal un mensaje con `to: userId`, y un `notify` declarado en `portal.config.ts`
lo intercepta y lo convierte en item de inbox.

**Decisión.** Tocar la puerta es `send({ type: "aldaba.knock", to: approverId, ... })`.

**Lo que esto compra.** El inbox es un WebSocket propio
(`wss://realtime.useportal.co/inbox`) e independiente de la suscripción al canal. El
aprobador recibe el knock sin estar conectado al canal del caso. Esa independencia es
justo lo que hace posible el escalamiento, y está confirmada en la página de wire
protocol: la posición de lectura del inbox avanza de forma independiente del watermark
del canal.

**Ventaja de presentación.** La lógica de escalamiento queda declarada en la
configuración de Portal y desplegada con su CLI, no escondida en un `fetch` del backend.
Es el tipo de integración que se lee limpia desde fuera.

---

## D6. El canal no se configura con membresía

`NotMemberError` se dispara en un canal con membresía cuando no hay fila para el
usuario, tanto al conectar como en un envío con `to:`. Los docs dicen que dar de alta
miembros ocurre en el backend, "outside this SDK's surface", y no documentan el
endpoint.

**Decisión.** No usar canales con membresía. El `authz` devuelve `allow()` para cualquier
token no anónimo. El control de quién puede aprobar vive en la cadena de aprobadores del
orquestador, no en la membresía de Portal.

**Sustento.** Evita depender de un endpoint que no está documentado y que puede costar
horas de descubrimiento en plena hackathon. Se puede endurecer después si sobra tiempo.

---

## D7. Identidad: JWTs propios

El inbox rechaza tokens anónimos con `403 anonymous_not_allowed`, porque necesita
identidad persistente entre sesiones. Los aprobadores no pueden ser anónimos.

La documentación admite un hueco propio y explícito: el flujo de tokens acuñados por
Portal no está documentado. Lo que sí está completo es verificar JWTs propios mediante
el bloque `auth` con `issuer`, `jwksUrl` y `claimMap`.

**Decisión.** Emitir JWTs propios y exponer un JWKS público desde el frontend de Next.js.

**Coste a contar en el plan.** Es una ruta de API corta más la generación del par de
claves, pero hay que hacerla antes de que nada del inbox funcione. No es opcional.

**Supuesto pendiente.** Existe `POST /v1/tokens/anonymous`, autenticado solo con la `pk_`
vía cabecera `x-portal-key`, verificado en el código de `@portalsdk/core`. Sirve para
probar canales y presencia sin backend, pero no para el inbox.

---

## D8. El escáner de presencia es una resta

`room.presence` devuelve `DetailedPresence` con `participants` en canales pequeños, o
`AggregatePresence` con solo conteo y deltas en los grandes. `room.members()` devuelve
el directorio, que no es estado vivo.

**Decisión.** La disponibilidad se calcula cruzando la cadena de aprobadores contra
`presence.participants`. La diferencia entre ambos conjuntos es el dato que la vista del
observador tiene que hacer visible: quién está de turno y no está.

**Umbral desconocido.** La documentación no dice a partir de cuántos participantes se
pasa a `aggregate`. Con una cadena de tres o cuatro aprobadores estamos claramente en
`detailed`. Si algún día importara, hay que preguntarlo.

**Nota.** `setMetadata` es presentación pura y la documentación advierte que nunca se usa
para autorización. No apoyar ninguna decisión de escalamiento en metadata de presencia.

---

## D9. Los temporizadores viven en el backend

**Decisión.** La cuenta atrás de cada puerta corre en el orquestador. El cliente solo
renderiza el tiempo restante a partir del `deadline` que viene en el payload del knock.

**Por qué.** Si el temporizador viviera en el cliente, cerrar la pestaña del observador
detendría el escalamiento. El agente tiene que seguir tocando puertas aunque nadie esté
mirando, que es literalmente la tesis del producto.

---

## D10. Tras cada deploy de configuración hay que reconectar

`portal deploy` es atómico y versionado, pero "channels with active connections keep
their current configuration until they restart; new connections use the new version
right away".

**Decisión operativa.** Cada vez que se toque el `notify` o el `authz`, reconectar los
clientes antes de dar por buena una prueba. Anotado aquí porque es el tipo de detalle
que a las tres de la mañana se convierte en una hora perdida persiguiendo un fantasma.

---

## Endpoints reales confirmados

Extraídos del código de los paquetes publicados, no de la documentación:

```
POST /v1/tokens/anonymous          cabecera x-portal-key con pk_
POST /v1/channels/{id}/messages    Authorization: Bearer {jwt de usuario}
GET  /v1/channels/{id}/history
GET  /v1/channels/{id}/members
POST /v1/deploys                   Authorization: Bearer sk_   (CLI)
PUT  /v1/secrets/{name}            Authorization: Bearer sk_   (CLI)
GET  /v1/webhooks/secret           Authorization: Bearer sk_
GET  /v1/webhooks/deliveries       Authorization: Bearer sk_
```

Códigos de error en cabecera `x-portal-error` y en el cuerpo como `{ code, reason? }`.
Ramificar por `code`, no por status HTTP, porque varios códigos comparten status.

---

## Lo que queda por verificar el viernes

Tres pruebas de curl, diez minutos, antes de escribir el orquestador. Ninguna bloquea
porque las tres tienen salida alternativa ya decidida arriba.

1. ¿Publica la `sk_` directamente contra `POST /v1/channels/{id}/messages`? Si no, el
   backend se emite su propio JWT y usa el mismo endpoint que el cliente.
2. ¿Llega el item de inbox a un usuario que nunca se conectó al canal? El wire protocol
   dice que sí. Confirmarlo con dos identidades.
3. ¿Dispara el `notify` con mensajes efímeros? Casi con certeza no, por D2. Ya está
   diseñado asumiendo que no.
