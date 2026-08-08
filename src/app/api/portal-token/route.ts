import { mintToken } from "@/lib/identity";
import { SEMBRADOS, nombreDeVisitante } from "@/lib/cast";

// Cada navegador recibe una identidad propia, no una compartida.
//
// Con un `ap_visitante` fijo, dos personas que abrian la URL a la vez eran el mismo
// usuario para Portal: la presencia contaba uno, y el enrutamiento no podia
// distinguirlas. La sala compartida solo significa algo si cada quien es alguien.

export const dynamic = "force-dynamic";

let siguiente = 0;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pedido = params.get("as");

  // Los sembrados piden su identidad por id; los humanos traen la suya.
  const sembrado = SEMBRADOS.find((a) => a.id === pedido);

  const identidad = sembrado
    ? { id: sembrado.id, nombre: sembrado.nombre, rol: sembrado.rol }
    : (() => {
        const id = pedido?.startsWith("ap_h") ? pedido : `ap_h${Date.now().toString(36)}`;
        const nombre = params.get("nombre") ?? nombreDeVisitante(siguiente++);
        return { id, nombre, rol: "Aprobador de turno" };
      })();

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
