import { sesionDe, reiniciar } from "@/lib/orchestrator";
import { canalDeCaso } from "@/lib/protocol";

// Arranca la sala. El escenario empieza solo cuando alguien abre la URL: nunca hay
// un estado inicial vacio esperando a que el visitante haga algo.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { sesionId = "demo", reset = false } = await request
    .json()
    .catch(() => ({}) as { sesionId?: string; reset?: boolean });

  try {
    if (reset) reiniciar(sesionId);
    await sesionDe(sesionId);
    return Response.json({ ok: true, sesionId, canal: canalDeCaso(sesionId) });
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "error desconocido";
    return Response.json({ ok: false, error: "no_arranco", motivo }, { status: 500 });
  }
}
