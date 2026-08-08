// Despliega portal.config.ts manteniendo el issuer en un solo sitio.
//
// portal.config.ts se empaqueta y corre en el borde de Portal, donde process.env no
// tiene nada de tu entorno local, asi que el issuer tiene que ser un literal. Este
// script reescribe ese literal desde ALDABA_ISSUER y despues despliega, para que la
// URL viva solo en .env.local y no haya dos fuentes de verdad que se desincronicen.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const CONFIG = "portal.config.ts";
const MARCA = /^(const ISSUER = )".*?"(; \/\/ aldaba:issuer)$/m;

function leerEnvLocal() {
  let texto = "";
  try {
    texto = readFileSync(".env.local", "utf8");
  } catch {
    throw new Error("No existe .env.local. Copia .env.example y completalo.");
  }
  const leer = (clave) => texto.match(new RegExp(`^${clave}=(.*)$`, "m"))?.[1]?.trim();
  return { issuer: leer("ALDABA_ISSUER"), secret: leer("PORTAL_SECRET") };
}

const { issuer, secret } = leerEnvLocal();

if (!issuer) throw new Error("Falta ALDABA_ISSUER en .env.local");
if (!secret) throw new Error("Falta PORTAL_SECRET en .env.local");
if (!issuer.startsWith("https://")) {
  throw new Error(
    `ALDABA_ISSUER tiene que ser https, y es "${issuer}". Portal alcanza el JWKS ` +
      `desde sus servidores, asi que localhost no sirve.`
  );
}

const limpio = issuer.replace(/\/$/, "");
const antes = readFileSync(CONFIG, "utf8");

if (!MARCA.test(antes)) {
  throw new Error(`No encontre la linea del issuer marcada con // aldaba:issuer en ${CONFIG}`);
}

const despues = antes.replace(MARCA, `$1"${limpio}"$2`);
if (despues !== antes) {
  writeFileSync(CONFIG, despues);
  console.log(`issuer sincronizado a ${limpio}`);
} else {
  console.log(`issuer ya estaba en ${limpio}`);
}

const r = spawnSync("npx", ["portal", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORTAL_SECRET: secret },
});
process.exit(r.status ?? 1);
