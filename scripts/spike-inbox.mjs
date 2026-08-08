// Spike de identidad. Es la prueba que decide si Aldaba existe.
//
// Verifica de punta a punta:
//   1. Aldaba firma un JWT y Portal lo acepta contra nuestro JWKS publico.
//   2. Un aprobador que NUNCA se conecto al canal recibe un toque en su inbox.
//
// El punto 2 es la mecanica entera del escalamiento. Si falla, el toque tiene que
// viajar por un mensaje dirigido en el canal y hay que replantear el producto.
//
//   node scripts/spike-inbox.mjs

import { Portal } from "@portalsdk/core";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])
);

const API_KEY = env.NEXT_PUBLIC_PORTAL_KEY;
const BASE = env.ALDABA_ISSUER;
const CANAL = `aldaba-case-spike-${Math.floor(Date.now() / 1000)}`;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const paso = (n, t) => console.log(`\n[${n}] ${t}`);

async function token(quien) {
  const r = await fetch(`${BASE}/api/portal-token?as=${quien}`);
  if (!r.ok) throw new Error(`token ${quien}: HTTP ${r.status}`);
  return (await r.json()).token;
}

paso(1, "Emitiendo tokens propios");
const [tokenAprobador, tokenAgente] = await Promise.all([
  token("ap_visitante"),
  token("ap_okada"),
]);
console.log("    dos JWT firmados con nuestra clave");

paso(2, "Abriendo el inbox del aprobador (nunca entra al canal)");
const aprobador = new Portal({ apiKey: API_KEY, token: tokenAprobador });
const inbox = aprobador.inbox();

const recibido = new Promise((resolve) => {
  inbox.on("item", (item) => resolve(item));
});
inbox.subscribe(() => {});

await espera(4000);
console.log(`    estado del inbox: ${inbox.status}`);
if (inbox.status !== "open" && inbox.status !== "ready") {
  console.log("    ATENCION: el inbox no abrio. Revisa auth.issuer y el JWKS.");
}

paso(3, "Dando de alta al aprobador como miembro del canal");
// Un envio dirigido a alguien que nunca se conecto falla con `not_member`, incluso
// con access "authz", porque ese modo une al usuario al conectarse y el aprobador
// solo esta en su inbox. El alta se hace desde el servidor con la sk_.
const alta = await fetch(`https://api.useportal.co/v1/channels/${CANAL}/members`, {
  method: "POST",
  headers: { authorization: `Bearer ${env.PORTAL_SECRET}`, "content-type": "application/json" },
  body: JSON.stringify({ userId: "ap_visitante" }),
});
console.log(`    alta: HTTP ${alta.status} ${await alta.text()}`);

paso(4, "El agente entra al canal y toca la puerta");
const agente = new Portal({ apiKey: API_KEY, token: tokenAgente });
const sala = agente.channel(CANAL);
sala.acquire();
await espera(3000);
console.log(`    estado del canal: ${sala.status}`);

const ack = await sala.send({
  type: "aldaba.knock",
  to: "ap_visitante",
  content: {
    caseId: "spike",
    agente: "ag_transfer",
    to: "ap_visitante",
    intento: 1,
    estabaConectado: false,
    deadline: new Date(Date.now() + 20_000).toISOString(),
    resumen: "Transferencia a proveedor nuevo por S/ 48 200",
  },
});
console.log(`    toque publicado, seq ${ack.seq ?? "-"}`);

paso(5, "Esperando el item en el inbox del aprobador");
const resultado = await Promise.race([recibido, espera(15_000).then(() => null)]);

console.log("\n" + "=".repeat(62));
if (resultado) {
  console.log("SPIKE VERDE");
  console.log("  titulo:", resultado.title ?? "(sin titulo)");
  console.log("  data:  ", JSON.stringify(resultado.data));
  console.log("\n  Un usuario que nunca se conecto al canal recibio el toque.");
  console.log("  El escalamiento por inbox funciona. Aldaba va.");
} else {
  console.log("SPIKE ROJO");
  console.log(`  contador del inbox: ${inbox.counter}, items: ${inbox.items.length}`);
  console.log("\n  Plan B: el toque viaja como mensaje dirigido en el canal.");
}
console.log("=".repeat(62));

sala.release();
process.exit(resultado ? 0 : 1);
