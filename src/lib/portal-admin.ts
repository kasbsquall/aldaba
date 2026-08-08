// Plano de control de Portal. Solo servidor: la sk_ nunca sale de aqui.
//
// La documentacion publica menciona que dar de alta miembros "ocurre en tu backend,
// fuera de la superficie del SDK", pero no publica el endpoint. Verificado a mano
// contra la API: POST /v1/channels/{id}/members con { userId } responde { added }.

const API = "https://api.useportal.co";

function secret(): string {
  const sk = process.env.PORTAL_SECRET;
  if (!sk) throw new Error("Falta PORTAL_SECRET");
  return sk;
}

async function admin(path: string, body: unknown) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    // Portal devuelve { code, reason? } y repite el codigo en x-portal-error.
    // Hay que ramificar por `code`, no por status, porque varios comparten status.
    const code = r.headers.get("x-portal-error") ?? String(r.status);
    const detalle = await r.text().catch(() => "");
    throw new Error(`Portal ${path} fallo: ${code} ${detalle}`.trim());
  }

  return r.json();
}

/**
 * Da de alta a los aprobadores en el canal del caso.
 *
 * Es obligatorio antes de tocar ninguna puerta. Un envio con `to:` a alguien que
 * nunca se conecto falla con `not_member`, incluso con access "authz", porque ese
 * modo une al usuario en el momento en que se conecta y el aprobador solo esta
 * escuchando su inbox. Sin esta alta previa, el escalamiento entero no funciona.
 */
export async function altaDeMiembros(
  canalId: string,
  usuarios: string[]
): Promise<number> {
  const resultados = await Promise.all(
    usuarios.map((userId) =>
      admin(`/v1/channels/${encodeURIComponent(canalId)}/members`, { userId })
    )
  );
  return resultados.reduce<number>(
    (total, r) => total + Number((r as { added?: number }).added ?? 0),
    0
  );
}
