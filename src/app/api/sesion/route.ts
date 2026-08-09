import { sesionDe, reiniciar, estaParada } from "@/lib/orchestrator";
import { canalDeCaso } from "@/lib/protocol";

// Arranca la sala. El escenario empieza solo cuando alguien abre la URL: nunca hay
// un estado inicial vacio esperando a que el visitante haga algo.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { sesionId = "demo", reset = false } = await request
    .json()
    .catch(() => ({}) as { sesionId?: string; reset?: boolean });

  try {
    // Reinicio explicito, o automatico si la sala lleva mas de minuto y medio sin un
    // solo evento. Quien abre la URL tiene que ver algo moviendose, siempre.
    if (reset || estaParada(sesionId)) reiniciar(sesionId);
    const sesion = await sesionDe(sesionId);

    // Devuelve la foto del tablero, no solo un acuse.
    //
    // En este entorno Portal entrega en vivo pero no persiste: el historial de un
    // canal vuelve siempre vacio, comprobado tambien en canales sin configuracion.
    // Sin esta foto, quien abre la URL un segundo despues de que arranque el
    // escenario se queda con la pantalla vacia y no hay nada que recuperar.
    return Response.json({
      ok: true,
      sesionId,
      canal: canalDeCaso(sesionId),
      tablero: sesion.instantanea(),
    });
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "error desconocido";
    return Response.json({ ok: false, error: "no_arranco", motivo }, { status: 500 });
  }
}
