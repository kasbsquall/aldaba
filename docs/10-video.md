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

---

# Guion y locución

Estilo de alguien probando la app, no de pitch. Español de Perú, tono tranquilo.
Nada de cifras inventadas: todo lo que se dice está en pantalla. Unas 190 palabras,
que en español dan entre 90 y 95 segundos con las pausas.

La frase que se repite y se queda es "le toca la puerta a esa persona", que además
es la marca.

| Tiempo | Escena | Locución |
|---|---|---|
| 0:00–0:06 | Frío: los cinco relojes bajando a la vez | Cinco operaciones. Cinco relojes. Y una sola persona libre. |
| 0:06–0:16 | El problema | Un agente que necesita permiso hoy escribe en un canal y se queda esperando. El mensaje sale a un sitio donde puede que no haya nadie mirando. |
| 0:16–0:28 | La sala | Aldaba hace otra cosa. Mira quién está conectado en este momento y le toca la puerta a esa persona. |
| 0:28–0:40 | Por qué se detuvo | Cada operación enseña la regla que la detuvo y lo que el agente había pensado antes de pararse. Esta es una transferencia a una contraparte sin historial. |
| 0:40–0:50 | Te tocan (entra el aviso) | Y cuando te toca a ti, lo sabes. Diecisiete segundos para decidir. |
| 0:50–0:58 | La firma | Firmo. El agente sigue. Segundos, no horas. |
| 0:58–1:08 | El escalado | Si no abro, no se queda esperando. Escala solo a la siguiente persona disponible. Tres puertas, y si nadie abre, la operación se retiene. |
| 1:08–1:20 | El árbitro | Cuando hay más operaciones que personas, un modelo reparte la cola y explica por qué. Decide el orden. Nunca el dinero. |
| 1:20–1:28 | Los datos | La mediana real de esta sesión, seis segundos hasta la firma. |
| 1:28–1:36 | Remate | Ninguna se ejecutó sin que una persona abriera la puerta. |

# El prompt de Suno (v5.5)

Verificado contra la documentación, y corregido respecto al primer borrador.

**Lo que NO funciona y había que quitar:** una línea de tiempo minuto a minuto en el
campo de estilos. Suno no la respeta. Es algo que repiten muchas guías y que no está
en el material oficial. Lo que sí acepta es **un único punto de transición**, indicando
qué cambia y aproximadamente cuándo, normalmente a un tercio o a la mitad del tema.

**Lo demás que dice la documentación:** el punto dulce está entre 80 y 200 palabras.
Por debajo de 80 el modelo rellena con valores por defecto; por encima de 200 empieza a
sopesar señales que se contradicen y suelta detalles. De 8 a 15 etiquetas.

## Estilos

```
Instrumental post-punk score for a product film. Mid-tempo and heavy, never fast.
Live drum kit hit hard, dry room, tom-driven, tambourine on the backbeat.
Overdriven bass guitar carrying the main riff up front. Angular single-coil
guitar, palm-muted, playing a motorik figure that repeats and never resolves.
No solos, no lead melody on top. Reference: Neu! and Trans Am playing something
by Preoccupations. 100 BPM, driving eighths.

It builds in layers rather than in tempo: bass and hi-hat alone at the start,
then the full kit, and at the halfway point the guitars stack and a second drum
layer comes in, holding that intensity to the end without ever speeding up.

Leave midrange headroom for a spoken voice.
```

## Letra

Instrumental.

## Excluir estilos

```
fast hardcore, blast beats, pop punk, ska, punk vocals, screaming, EDM,
trailer braams, epic orchestral, uplifting corporate, choir, cinematic risers,
build-drop, lo-fi, ambient drone
```

## Ajustes

| Campo | Valor |
|---|---|
| Rareza | 35% |
| Influencia del estilo | 85% |
| Duración | Personalizada, 1:45 |

El 85% de influencia sujeta lo que más tiende a ignorar un modelo cuando le dices punk:
el "mid-tempo, never fast". Más bajo y devuelve algo genérico por mucho cuidado que le
hayas puesto al texto.

## Por qué cambió el carácter

Dos borradores descartados. El primero pedía a Reznor y Atticus Ross puntuando un
thriller y salía demasiado oscuro, a amenaza. El segundo corrigió tanto que se quedó
suave. Esta tercera versión es post-punk instrumental de tempo medio: la urgencia la
dan el bajo saturado y las corcheas, no la velocidad.

Los 100 BPM son deliberados. El punk va a 160 o 180 y ahí no cabe una locución encima.
A 100, con el bajo empujando cada corchea, la sensación es de urgencia sin carrera.
Y lo progresivo va por acumulación de capas, como el krautrock motorik: nunca acelera,
solo se pone más denso.

## Cómo se mezcla

Con el mp3 de Suno ya descargado:

```
MUSIC_FILE=/ruta/al/suno.mp3 python C:/Users/User/.claude/skills/hackathon-video/scripts/audio_gen.py --provider cartesia
```

Ese script sintetiza cada escena por separado, la mide con ffprobe y saca
`scene_timing.json`, de donde salen los tiempos. Así el vídeo se sincroniza con las
palabras reales y no con una estimación.
