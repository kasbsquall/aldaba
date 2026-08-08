import { sesionDe } from "@/lib/orchestrator";

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

  const { sesionId = "demo", agente, aprobador, decision, nota } = body;

  if (!agente || !aprobador || (decision !== "aprobado" && decision !== "rechazado")) {
    return Response.json({ ok: false, error: "peticion_incompleta" }, { status: 400 });
  }

  const sesion = await sesionDe(sesionId);
  const r = await sesion.resolver(agente, aprobador, decision, nota);

  return Response.json(r, { status: r.ok ? 200 : 409 });
}
