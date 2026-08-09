import { jwtVerify, importJWK } from "jose";
import { sesionDe } from "@/lib/orchestrator";
import { publicJwks } from "@/lib/identity";

// Recibe la decision humana. El orquestador comprueba que ese carril siga esperando
// y que quien responde sea a quien se le toco: el cliente no puede resolver un
// carril que no es suyo ni revivir uno que ya vencio.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sesionId?: string;
    agente?: string;
    aprobador?: string;
    decision?: "aprobado" | "rechazado";
    nota?: string;
  };

  const { sesionId = "demo", agente, decision, nota } = body;

  if (!agente || (decision !== "aprobado" && decision !== "rechazado")) {
    return Response.json({ ok: false, error: "peticion_incompleta" }, { status: 400 });
  }

  // La identidad sale del token, nunca del cuerpo. Con el aprobador puesto a mano
  // cualquiera podia firmar en nombre de otro, y el blanco mas dañino era el actor
  // que por guion no abre la puerta: hacerle firmar desmonta la demostracion.
  const cabecera = request.headers.get("authorization") ?? "";
  const cookie = request.headers.get("cookie") ?? "";
  const deCookie = /(?:^|;\s*)aldaba_id=([^;]+)/.exec(cookie)?.[1] ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : deCookie;
  if (!token) {
    return Response.json({ ok: false, error: "sin_identidad" }, { status: 401 });
  }

  let aprobador: string;
  try {
    const clave = await importJWK(publicJwks().keys[0], "RS256");
    const { payload } = await jwtVerify(token, clave);
    if (!payload.sub) throw new Error("sin sub");
    aprobador = String(payload.sub);
  } catch {
    return Response.json({ ok: false, error: "identidad_invalida" }, { status: 401 });
  }

  const sesion = await sesionDe(sesionId);
  const r = await sesion.resolver(agente, aprobador, decision, nota);

  return Response.json(r, { status: r.ok ? 200 : 409 });
}
