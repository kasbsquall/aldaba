# Dirección de diseño

Escrita antes de la primera línea de estilos. Existe porque el output visual por
defecto de un modelo converge al centro estadístico del diseño, y eso no se corrige
escribiendo más CSS después.

Prueba de ello: consultando la base de datos de `ui-ux-pro-max` con la descripción de
este producto, la recomendación fue modo oscuro OLED, Fira Code y Lucide. Es
exactamente el promedio del que hay que salir. La base sirve para consultar datos
concretos; la dirección se decide a mano.

---

## Los cuatro puntos

**Propósito.** Hacer visible que la atención humana es un recurso escaso y que hoy
nadie la administra. La pantalla tiene que dejar claro, sin que nadie lo narre, que
hay más agentes pidiendo una firma que personas disponibles para darla.

**Audiencia.** Alguien que aprueba operaciones financieras y hace este gesto muchas
veces al día. Escanea primero cuánto tiempo le queda, después cuánto dinero está en
juego, y solo entonces lee el razonamiento. La composición sigue ese orden.

**Tono.** Sala de control editorial. Tratamiento de revista aplicado a datos
operativos: jerarquía tipográfica extrema, mucho aire entre bloques y ninguno dentro
de las filas, composición rota en vez de rejilla uniforme. Fondo claro a propósito,
porque casi todo lo que se va a presentar este fin de semana va a ser oscuro.

**Detalle memorable.** El contador de escasez. Un número enorme que dice cuántas
personas hay disponibles frente a cuántas solicitudes esperan, y que cambia en vivo
cuando alguien entra o se libera. Es lo primero que se ve y lo único que hay que
entender en los primeros diez segundos.

---

## Lo que decidieron los tres jurados y que gobierna la composición

**El razonamiento no es el protagonista.** Texto de modelo apareciendo en una caja es
lo que va a hacer todo el mundo. Lo que nadie más va a tener en pantalla es un roster
de personas con estados de disponibilidad y un contador de escasez. Ese bloque se
lleva el sitio de honor; el razonamiento vive comprimido salvo en el carril abierto.

**Un solo elemento con texto en movimiento.** Cinco flujos de texto compiten por el
mismo canal de lectura y el espectador termina sin mirar ninguno. Cinco relojes, en
cambio, se leen en paralelo como un tablero de salidas de aeropuerto. La diferencia
entre ruido y tensión está en qué se anima, no en cuántas cosas hay.

**Hace falta el contrafactual.** Ocho segundos al abrir mostrando lo que pasa hoy: el
agente congelado y un cronómetro que sube sin techo. Sin ese plano, la pantalla se
evalúa como diseño de dashboard. Con él, se evalúa como respuesta a un problema que el
jurado acaba de ver.

---

## Tipografía

| Uso | Familia | Por qué |
|---|---|---|
| Titulares y voz de marca | Bricolage Grotesque Variable | Tiene eje de optical size, así que el mismo tipo se comporta distinto a 76px y a 12px. OFL. |
| Cifras, relojes, montos, IDs | Martian Mono Variable | Monoespaciada con carácter, ancho tabular por construcción. OFL. |

Prohibidas y no usadas: Inter, Roboto, Arial, Open Sans, Helvetica, fuentes del
sistema, y el combo Space Grotesk con Instrument Serif y Geist. Departure Mono encaja
con la dirección pero no se distribuye por fontsource, y en un repo público conviene
quedarse en OFL.

Escala modular 1.25. Tracking negativo progresivo: cuerpo en 0, titulares entre
-0.015em y -0.022em, display sobre 64px en -0.035em. Line-height de display entre 0.82
y 0.92.

Todo dato numérico lleva `font-variant-numeric: tabular-nums lining-nums slashed-zero`.
Sin eso los relojes bailan al pasar de 9 a 10 y se nota.

Jerarquía por escala extrema: el contador de escasez a 76px junto a su etiqueta de
11px es un ratio de casi 7x. Nunca tres tamaños parecidos en semibold.

---

## Color

Compuesto primero en blanco y negro. Si la jerarquía no funciona por masas en escala
de grises, el color no la salva.

Una sola familia de grises, tintada cálida de forma consistente. Nada de `#000000` ni
`#FFFFFF` puros. Las sombras se tintan con el tono del fondo, nunca negro a baja
opacidad.

Un solo acento, rojo señal, reservado a una única cosa: el plazo que está por vencer.
Cubre bastante menos del 5% de los píxeles. Que el rojo signifique siempre lo mismo es
lo que lo hace legible de un vistazo.

Los estados no se distinguen solo por color, también por masa tipográfica y por peso.
Un reloj cerca de cero es más grande y más pesado, no solo más rojo. El video
comprimido de la plataforma destruye las diferencias sutiles de color y no las de
tamaño.

---

## Espaciado

El espacio es un elemento de composición, no relleno. Agrupar apretado y separar
mucho: la proporción entre el intervalo menor y el mayor es de al menos 1:24. Si todo
el espaciado vive entre 8 y 48px sigue siendo uniforme y se nota.

El aire va entre bloques, nunca dentro de las filas. Las filas van densas, llenas de
dato.

---

## Layout

Composición rota a propósito. El carril con el que interactúa el visitante ocupa dos
tercios del ancho, con su reloj grande y su razonamiento visible. Los otros cuatro
viven en una columna estrecha, comprimidos a una línea de estado con su reloj, y sin
texto en movimiento. Cuando el visitante resuelve el suyo, el siguiente sube al bloque
protagonista.

Prohibidos, por ser los delatores más fiables de interfaz generada: `border-left` de
color para destacar filas, tres o más cards iguales en fila, gradiente morado o azul,
espaciado uniforme, radios distintos por componente.

Un solo primitivo repetido en todo el producto. Radio de 2px, porque son datos duros.
Divisorias de 1px con alfa entre 6 y 10%.

---

## Iconografía

Phosphor en peso Light, un solo grosor y un solo tamaño base. Prohibidos Font Awesome,
Material Icons, y Lucide o Feather como set principal. Emojis nunca, en ningún sitio.

Los iconos van donde codifican información, y hay que cubrir toda la pantalla: estados
de disponibilidad, tipos de operación, pasos del razonamiento, tendencias, acciones.
Un icono suelto en una pantalla llena de listas es trabajo a medias.

---

## Motion

Techo de 300ms. Micro-interacción entre 100 y 150ms, interfaz estándar entre 150 y
250ms. La salida va un 20% más rápida que la entrada. Solo `transform` y `opacity`.
`prefers-reduced-motion` cubierto sin excepción.

Coreografía de entrada, que es lo que separa una pantalla viva de una estática:

- Los bloques principales entran con `rise` a 240ms, con 60ms entre bloque y bloque.
- Las filas de la columna estrecha entran escalonadas a 30ms por fila, con tope en 8.
- Los relojes no parpadean. Se acercan a cero ganando masa.
- Las cifras que cambian se animan dígito a dígito.

Presupuesto de movimiento explícito y no negociable: un texto corriendo, un
reordenamiento de carriles, un reloj entrando en rojo. Todo lo demás quieto.
