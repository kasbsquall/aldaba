// Prueba de humo del orquestador. Arranca una sesion, escucha el canal como
// aprobador visitante y verifica que la maquina de escalamiento se mueva sola:
// umbrales, roster, toques, vencimientos y escalada a la siguiente puerta.
//
//   node scripts/prueba-orquestador.mjs

import { Portal } from "@portalsdk/core";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])
);

const BASE = env.ALDABA_ISSUER;
const SESION = `humo${Math.floor(Date.now() / 1000)}`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const { token } = await (await fetch(`${BASE}/api/portal-token?as=ap_visitante`)).json();
const portal = new Portal({ apiKey: env.NEXT_PUBLIC_PORTAL_KEY, token });

const sala = portal.channel(`aldaba-case-${SESION}`);
const vistos = [];
sala.on("message", (m) => {
  vistos.push(m.type);
  const c = m.content ?? {};
  const etiqueta = { ...c, resumenRazonamiento: undefined };
  console.log(
    `  ${String(m.type).padEnd(18)} ${c.agente ?? ""} ${
      m.type === "aldaba.knock"
        ? `-> ${c.to} (conectado: ${c.estabaConectado}, intento ${c.intento})`
        : m.type === "aldaba.timeout"
          ? `venció con ${c.aprobador}`
          : m.type === "aldaba.roster"
            ? `conectados [${c.conectados}] orden [${c.orden}]`
            : m.type === "aldaba.threshold"
              ? c.regla
              : etiqueta.desenlace ?? etiqueta.motivo ?? ""
    }`
  );
});
sala.acquire();
await espera(3000);
console.log(`canal: ${sala.status}\n`);

console.log("arrancando sesión…\n");
const r = await fetch(`${BASE}/api/sesion`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sesionId: SESION }),
});
console.log(`  ${JSON.stringify(await r.json())}\n`);

// Deja correr un ciclo completo: bloqueos escalonados hasta el segundo 15, plazos
// de 18 a 30 segundos, y al menos un vencimiento con su escalada.
await espera(55_000);

const cuenta = (t) => vistos.filter((v) => v === t).length;
console.log("\n" + "=".repeat(58));
console.log(`umbrales cruzados : ${cuenta("aldaba.threshold")} / 5`);
console.log(`rosters publicados: ${cuenta("aldaba.roster")}`);
console.log(`puertas tocadas   : ${cuenta("aldaba.knock")}`);
console.log(`plazos vencidos   : ${cuenta("aldaba.timeout")}`);
console.log(`handoffs          : ${cuenta("aldaba.handoff")}`);

const ok = cuenta("aldaba.threshold") === 5 && cuenta("aldaba.knock") > 5 && cuenta("aldaba.timeout") > 0;
console.log(ok ? "\nORQUESTADOR VERDE: escala solo, sin que nadie lo toque." : "\nREVISAR");
console.log("=".repeat(58));

sala.release();
process.exit(ok ? 0 : 1);
