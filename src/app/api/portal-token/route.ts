import { mintToken } from "@/lib/identity";
import { APROBADORES, VISITANTE } from "@/lib/cast";

// Quien abre la URL recibe identidad al vuelo, sin registro ni login. El requisito
// del jurado es abrir el enlace y probar el producto, asi que cualquier friccion de
// autenticacion antes de ver el producto es una friccion que sobra.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const pedido = new URL(request.url).searchParams.get("as");
  const identidad = APROBADORES.find((a) => a.id === pedido) ?? VISITANTE;

  try {
    const token = await mintToken({
      userId: identidad.id,
      username: identidad.nombre,
    });
    return Response.json({ token, identidad });
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "error desconocido";
    return Response.json({ error: "no_se_pudo_emitir_token", motivo }, { status: 500 });
  }
}
