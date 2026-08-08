# Aldaba

**El agente que toca puertas hasta que alguien abre.**

Producto en vivo: **https://aldaba.107-172-6-206.sslip.io**

Construido para The Realtime Hackathon by Portal x Crafter Station, del 7 al 9 de
agosto de 2026, en solitario.

---

## El problema

Los agentes de IA se congelan esperando aprobación humana.

El patrón de humano en el ciclo ya está resuelto y es estándar. LangChain trae
`HumanInTheLoopMiddleware`, existe HumanLayer para enrutar aprobaciones a Slack,
Permit.io tiene un servidor MCP para lo mismo. Todas comparten el mismo defecto:
agregar una interrupción introduce latencia sin cota. Un grafo autónomo termina en
segundos, uno con compuerta humana puede quedarse congelado horas.

Ninguna puede resolverlo, porque ninguna sabe quién está disponible en este momento.
LangGraph no tiene concepto de presencia. HumanLayer manda el mensaje y confía.

**Portal sí tiene presencia como primitiva.** Esa es la razón por la que Aldaba solo
puede existir sobre Portal.

## Qué hace

Cinco agentes trabajan en paralelo sobre operaciones financieras. Cada uno llega a su
propia decisión bloqueante y los cinco compiten por las pocas personas conectadas.

1. Cada agente **razona en voz alta** por un canal de Portal mientras trabaja.
2. Al cruzar su umbral, **lee la presencia del canal** para saber quién está conectado
   y libre ahora mismo, no quién debería estar según un calendario.
3. **Toca esa puerta** por el inbox de Portal, que llega aunque esa persona no esté en
   el canal donde el agente trabaja.
4. Si no le abren dentro del plazo, **escala solo** a la siguiente. El reloj es visible.
5. Cuando alguien firma, **el agente reanuda al instante**.

La pantalla muestra el número que resume todo: cuántas personas están libres frente a
cuántas operaciones esperan una firma.

## Cómo probarlo

Abre el enlace. Recibes identidad al vuelo, sin registro, y entras como aprobador de
turno. El escenario arranca solo.

Dos cosas para mirar:

**Si firmas**, el agente reanuda y la siguiente operación sube al bloque principal.

**Si no haces nada**, el reloj se agota y el agente busca a otra persona. En la cadena
de puertas tocadas se ve quién no abrió y a quién le tocó después. Ese es el producto.

---

## Cómo se usó Portal

Portal no es el transporte de una app de humanos aquí. Es el sustrato donde conviven
los agentes y las personas, y la fuente de la decisión de enrutamiento.

**Presencia como entrada de decisión, no como adorno.** El orquestador mantiene su
propia conexión al canal y lee `room.presence` cada vez que tiene que elegir a quién
tocarle la puerta. Ordena la cadena en tres rangos: conectado y libre, conectado pero
ocupado, ausente. Esa reordenación en vivo es lo que ninguna herramienta del mercado
hace, porque ninguna sabe quién está ahí.

**Inbox para alcanzar a quien no está mirando.** El toque viaja como mensaje público al
canal, para que el tablero vea la cadena completa, y un puente `notify` declarado en
`portal.config.ts` lee el destinatario del contenido y dirige la notificación a una
sola persona. Así el aprobador recibe el aviso sin estar suscrito al canal del caso.

**Autorización y membresía server-side.** `portal.config.ts` declara `access: "authz"`,
que admite y une al usuario en el acto, y un callback que rechaza tokens anónimos.

**Identidad propia.** El inbox rechaza tokens anónimos, así que Aldaba firma sus propios
JWT con RS256 y publica su JWKS en `/.well-known/jwks.json`. Portal los verifica contra
ese endpoint mediante el bloque `auth`.

**Los aprobadores automáticos tienen presencia real.** Cada uno abre su propia conexión
con su propia identidad, así que el roster que lee el enrutamiento no está simulado. Lo
único guionado es su conducta, y se declara en pantalla.

### Qué costó, como feedback

Tres cosas que no están en la documentación y que se resolvieron probando:

**`access` por defecto rompe los envíos dirigidos.** Con `anonymous: false` y sin
`access` explícito, el canal cae en `"membership"`, y ahí un envío con `to:` a alguien
sin fila de miembro falla con `not_member`. Toda la mecánica de escalamiento dependía
de eso. `access: "authz"` lo resuelve, pero el valor que parece seguro es el que rompe.

**El alta de miembros no está publicada.** La documentación dice que dar de alta
miembros "ocurre en tu backend, fuera de la superficie del SDK" y no dice cómo.
Probando la API apareció `POST /v1/channels/{id}/members` con `{ userId }`.

**Los mensajes no persisten.** En este entorno el historial de un canal vuelve siempre
vacío y todo envío resuelve con `seq: undefined`. Lo comprobamos con tipos con punto,
con guion bajo y sin prefijo, y también en un canal sin configuración alguna, así que
no era el `authz` ni el `notify`. La consecuencia práctica es que un cliente que se
conecta un segundo tarde no puede recuperar nada. Aldaba lo resuelve devolviendo una
foto del estado desde el servidor al arrancar y aplicando los mensajes en vivo encima.

Un detalle menor: `portal.config.ts` se empaqueta y corre en el borde, así que
`process.env` no tiene nada del entorno local. El issuer va como literal y un script lo
sincroniza antes de desplegar.

---

## Arquitectura

```
src/lib/orchestrator.ts   Cinco carriles, escalamiento por presencia y contención
src/lib/portal-server.ts  Conexión del servidor al canal: lee presencia y publica
src/lib/portal-admin.ts   Plano de control con la sk_, solo servidor
src/lib/protocol.ts       Once tipos de mensaje bajo el prefijo aldaba.
src/lib/identity.ts       Firma de JWT propios y JWKS público
src/lib/seeded.ts         Aprobadores automáticos con presencia real
portal.config.ts          authz, access y el puente notify
```

**Corre como proceso largo, no en serverless.** El orquestador mantiene temporizadores
reales, estado en memoria y WebSockets vivos. Una función que se congela al responder
no puede sostener el escalamiento. Ver [deploy/README.md](deploy/README.md).

**Los plazos viven en el servidor.** Si vivieran en el cliente, cerrar la pestaña
detendría el escalamiento, y que el agente siga tocando puertas aunque nadie mire es
justo lo que el producto afirma.

## Qué es real y qué está guionado

Se declara aquí en vez de esconderlo.

**Real:** la presencia, el enrutamiento, la contención, los plazos, el escalamiento, el
inbox, la identidad y el ciclo completo de firma y reanudación.

**Guionado:** las operaciones financieras son ficticias. De los cinco carriles, solo el
protagonista corre un modelo en vivo si hay `ANTHROPIC_API_KEY`; los otros cuatro
publican trazas escritas por el mismo canal y con la misma forma de mensaje. La razón
es concreta: cinco modelos concurrentes por cada visitante topan límites de tasa
exactamente durante la ventana de evaluación. Los dos aprobadores automáticos tienen
presencia auténtica y conducta declarada, y la interfaz los rotula como automáticos.

## Correr en local

```bash
npm install
cp .env.example .env.local   # completar con las claves de Portal
node scripts/generate-keys.mjs
npm run dev
```

Portal alcanza el JWKS desde sus servidores, así que `ALDABA_ISSUER` tiene que ser una
URL pública con HTTPS. Para desarrollo sirve un túnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Después, sincronizar el issuer y desplegar la configuración:

```bash
npm run portal:deploy
```

Pruebas de la mecánica, sin interfaz:

```bash
node scripts/spike-inbox.mjs        # identidad propia y toque por inbox
node scripts/prueba-orquestador.mjs # escalamiento de cinco carriles
```

## Documentación del proceso

- [docs/00-decisiones-portal.md](docs/00-decisiones-portal.md) · diez decisiones con su sustento
- [docs/01-vocabulario-mensajes.md](docs/01-vocabulario-mensajes.md) · el protocolo sobre Portal
- [docs/02-direccion-diseno.md](docs/02-direccion-diseno.md) · la dirección visual, escrita antes del CSS
- [docs/07-pendientes.md](docs/07-pendientes.md) · lo abierto y lo resuelto
- [docs/08-auditorias.md](docs/08-auditorias.md) · auditorías de interacción, wording y composición

## Licencia

MIT
