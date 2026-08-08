# Auditorías

Tres subagentes independientes, un eje cada uno, sobre el código y el despliegue.

## BLOQUEANTE abierto · el tablero no se puebla en sesión nueva

El overlay ya se desmonta (corregido y verificado: `overlayEnDom: false`), pero en una
sesión limpia el tablero se queda en esqueleto. Con la sesión ya vista funciona.

Por dónde seguir: instrumentar `useSala` para confirmar si `/api/sesion` se dispara y
si `useChannel` recibe mensajes. Sospecha principal: el escenario arranca en el
servidor pero el cliente se suscribe al canal antes de que exista, y como el
historial se pide una sola vez al conectar, se queda sin nada y sin reintento.
Comprobar si `useChannel` recarga historial al reconectar o si hace falta forzarlo.

## Corregido en esta pasada

El overlay del contrafactual no se desmontaba: quedaba a `opacity: 0` con `inset: 0`
y `pointer-events: auto`, invisible y tragándose todos los clics de la página. La
pantalla se veía perfecta y no respondía a nada. Ahora se retira solo, sin depender
de que el padre actualice estado, y deja de recibir clics en cuanto empieza a salir.

El listener global cerraba con Enter y Space. Un usuario de teclado podía tabular a
ciegas, pulsar Enter y firmar una transferencia que no había visto. Ahora solo Escape.

La sala pasa a cliente puro con `dynamic(ssr: false)`, que elimina la clase entera de
desajustes de hidratación en vez de perseguir cada síntoma.

## Pendiente de las auditorías, por prioridad

### Interacción
- A 375px la columna protagonista mide 0px y hay scroll horizontal. Ilegible en móvil.
- Contraste de `--tinta-tenue` en 3.85:1, bajo AA, y aplicado a texto de 11px.
- Sin regiones vivas: un lector de pantalla no se entera de que le tocan la puerta.
- Carga, vacío y error son la misma pantalla. `estado` se calcula y no se consume.
- Te pueden tocar dos puertas y solo puedes abrir una: la fila secundaria dice
  "tocando a Tú", tiene reloj, y no es interactiva.
- Los botones tienen dos estados de seis. Sin hover, sin disabled, sin loading.
- Doble envío posible en "Firmar": sin bloqueo ni lectura de la respuesta.
- La tarjeta protagonista cambia de operación bajo el cursor sin aviso.

### UX writing
- `aprobadorId` crudo en pantalla: "ejecutada tras la firma de ap_visitante".
- "firmada por Tú" cuando firma el visitante.
- El contador dice "disponibles" pero cuenta conectados, y la tesis del producto es
  justamente que estar presente no es estar disponible.
- El razonamiento afirma cosas falsas en cuatro de los cinco agentes: "312 clientes
  afectados no tiene historial previo", "Mesa de dinero no tiene historial previo".
- No hay ninguna frase en la sala que explique qué hace el producto.
- El plazo que gobierna el escalamiento no aparece en ninguna parte.

### Pixel perfect
- El rojo significa tres cosas distintas: escasez, puerta actual y plazo.
- Tres columnas idénticas en el bloque protagonista, que la dirección prohíbe.
- El ratio de espaciado real es 1:8, no 1:32. `--hueco-24` y `--hueco-32` sin usar.
- Bricolage importado sin su eje de optical size, que era la razón de elegirla.
- La marca a 22px del header se lee como "O••", que es el indicador de "escribiendo".
- Medida de 103 caracteres por línea en el bloque de razonamiento.
