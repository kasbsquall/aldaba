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

  // Los sembrados solo se acuñan desde dentro del proceso, con el secreto que
  // comparten servidor y actores. Sin esta guarda cualquiera pedia el token de
  // M. Rivas, el actor que por guion nunca abre la puerta, y firmaba en su nombre:
  // con eso se desmonta desde otra pestaña la demostracion central del producto.
  const interno = params.get("k") === (process.env.ALDABA_INTERNAL_KEY ?? "");
  const sembrado = interno ? SEMBRADOS.find((a) => a.id === pedido) : undefined;

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
    // El mismo token viaja como cookie httpOnly. Asi el navegador acredita quien es
    // al firmar sin que el cliente tenga que manejarlo, y el servidor deja de creerse
    // el nombre que venga en el cuerpo de la peticion.
    return Response.json(
      { token, identidad },
      {
        headers: {
          "set-cookie": `aldaba_id=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200`,
        },
      }
    );
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "error desconocido";
    return Response.json({ error: "no_se_pudo_emitir_token", motivo }, { status: 500 });
  }
}
