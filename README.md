# Aldaba

El agente que toca puertas hasta que alguien abre.

Construido para The Realtime Hackathon by Portal x Crafter Station, del 7 al 9 de
agosto de 2026.

## El problema

Los agentes de IA se congelan esperando aprobación humana. El patrón de humano en el
ciclo ya está resuelto y es estándar: LangChain trae `HumanInTheLoopMiddleware`, existe
HumanLayer para enrutar aprobaciones a Slack. Todas comparten el mismo defecto. Agregar
una interrupción introduce latencia sin cota: un grafo autónomo termina en segundos, uno
con compuerta humana puede quedarse congelado horas.

Ninguna de esas herramientas puede resolverlo, porque ninguna sabe quién está disponible
en este momento. LangGraph no tiene concepto de presencia. HumanLayer manda un mensaje y
confía.

## Qué hace Aldaba

Invierte la espera. El agente sale a buscar.

1. Transmite su razonamiento en vivo por un canal de Portal.
2. Lee `room.presence` para saber quién de la cadena de aprobadores está conectado
   ahora mismo, no quién debería estar según un calendario.
3. Toca esa puerta por el inbox de Portal, que llega aunque esa persona no esté en el
   canal donde el agente trabaja.
4. Si no le abren dentro del plazo, escala a la siguiente. El reloj es visible.
5. Cuando alguien decide, el agente reanuda al instante.

Varios agentes trabajan en paralelo y compiten por las pocas personas conectadas. La
atención humana es el recurso escaso, y la pantalla lo muestra.

## Estado

En construcción. Ver [docs/00-decisiones-portal.md](docs/00-decisiones-portal.md) para
las decisiones de arquitectura y [docs/01-vocabulario-mensajes.md](docs/01-vocabulario-mensajes.md)
para el protocolo de mensajes sobre Portal.

## Licencia

MIT
