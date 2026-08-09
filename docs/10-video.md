# Encargo del video

Todo lo que hace falta para grabar sin volver a preguntar nada.

## Cómo arrancar

Sesión nueva, en la raíz del proyecto:

```
/hackathon-video
```

Y este contexto pegado detrás:

> Producto en https://aldaba.107-172-6-206.sslip.io. Grabación con Playwright y ffmpeg,
> navegador propio, nunca la pantalla del usuario. Voz con Cartesia, no ElevenLabs.
> Estilo de alguien probando la aplicación en directo, no un pitch. Español de Perú,
> tono tranquilo. Duración 90 segundos.

## Antes de grabar, comprobar

1. **Crédito de la API de Anthropic.** Si falta, el bloque del árbitro dice "REPARTO
   POR REGLA". En el video tiene que decir "REPARTO DECIDIDO POR EL MODELO", que es la
   única prueba visible de que hay IA decidiendo. Se comprueba en los logs del VPS:
   `pm2 logs aldaba --lines 100 --nostream | grep arbitro`
2. **Dos pestañas abiertas** en la misma sala, para que la presencia sea real y se vea
   a una persona conectarse y desconectarse.
3. El contrafactual de entrada dura 8 segundos y tiene botón "Saltar". Decidir si entra
   en el video (cuenta el problema) o se salta.

## Secciones, en orden

| # | Qué se ve | Qué se dice |
|---|---|---|
| 1 | Contrafactual de entrada, el contador subiendo | Hoy un agente pide permiso y se queda esperando en un canal donde no hay nadie mirando |
| 2 | La sala entera, cifra de escasez y franja de cinco plazos | Cinco agentes necesitan una firma. Las cinco corriendo a la vez, con su reloj |
| 3 | Zoom a la tarjeta protagonista, razonamiento del agente | Por qué se detuvo esta operación, y qué había pensado antes de detenerse |
| 4 | El aviso "TE TOCAN LA PUERTA" entrando | No espera en una cola: mira quién está conectado y le toca la puerta a esa persona |
| 5 | Firmar, y la operación siguiendo | La firma llega en segundos, no en horas |
| 6 | Un plazo venciendo y el escalado a la siguiente puerta | Si nadie abre, escala solo. Tres puertas, y si no, se retiene |
| 7 | La caja del arbitraje con el motivo del modelo | Cuando hay menos personas que operaciones, un modelo reparte la cola. Nunca decide el dinero |
| 8 | La banda inferior, rastro e histograma con la mediana | Cuánto tarda de verdad en llegar una firma |
| 9 | El remate, "N salieron adelante y N quedaron retenidas" | Ninguna se ejecutó sin que una persona abriera la puerta |

## Reglas del skill que aplican aquí

- **Microsonidos obligatorios** de la librería CC0 que trae el skill. Nunca sonidos del
  sistema. Mezcla entre 0.10 y 0.25, siempre por debajo de la voz. Los momentos que los
  piden: entrada del aviso, firma, plazo vencido, reordenamiento de filas.
- Subtítulos quemados estilo karaoke.
- Sin emojis en ningún fotograma.

## Datos del producto para el guion

- Cinco agentes con nombre quechua: Kuntur (pagos), Yaku (reembolsos), Rumi (límites),
  Wayra (cambio), Ayni (planilla).
- Los plazos van de 18 a 30 segundos según severidad. Tres puertas por operación.
- Los colores dicen el estado: ámbar corriendo, verde firmada, rojo vencida, violeta
  retenida.
- La tesis: la máquina reparte el orden de la cola, la persona decide el dinero.

## Lo que NO se debe decir

Nada de cifras inventadas de ahorro, adopción o comparaciones con "ayer". Todo lo que
salga en pantalla es real y medido; el guion tiene que quedarse en eso.

## Pitch para el formulario

Opción D, 184 caracteres, en `docs/09-entrega.md`.
