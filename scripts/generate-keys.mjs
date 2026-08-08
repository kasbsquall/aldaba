// Genera (o rota) el par RSA que firma los JWT de Aldaba y sirve el JWKS.
// La privada va a .env.local, que git ignora. Reemplaza las claves anteriores en
// lugar de acumularlas, para que rotar sea correr esto otra vez.
import { generateKeyPair, exportPKCS8, exportJWK, calculateJwkThumbprint } from "jose";
import { writeFileSync, existsSync, readFileSync } from "node:fs";

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });

const pkcs8 = await exportPKCS8(privateKey);
const publicJwk = await exportJWK(publicKey);
const kid = await calculateJwkThumbprint(publicJwk);
Object.assign(publicJwk, { kid, use: "sig", alg: "RS256" });

const CLAVES = ["ALDABA_JWT_KID", "ALDABA_JWT_PRIVATE_KEY", "ALDABA_JWT_PUBLIC_JWK"];

const envPath = ".env.local";
const previo = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

// Descarta las lineas de las claves anteriores, incluidas las continuaciones del
// PEM multilinea, y conserva todo lo demas del archivo intacto.
const conservadas = [];
let dentroDeBloque = false;
for (const linea of previo.split(/\r?\n/)) {
  const abre = CLAVES.find((c) => linea.startsWith(`${c}=`));
  if (abre) {
    const valor = linea.slice(abre.length + 1);
    const comilla = valor[0];
    dentroDeBloque =
      (comilla === '"' || comilla === "'") &&
      !(valor.length > 1 && valor.endsWith(comilla));
    continue;
  }
  if (dentroDeBloque) {
    if (linea.endsWith('"') || linea.endsWith("'")) dentroDeBloque = false;
    continue;
  }
  conservadas.push(linea);
}

const bloque = [
  `ALDABA_JWT_KID=${kid}`,
  `ALDABA_JWT_PRIVATE_KEY="${pkcs8.trim().replace(/\n/g, "\\n")}"`,
  `ALDABA_JWT_PUBLIC_JWK='${JSON.stringify(publicJwk)}'`,
];

writeFileSync(envPath, `${[...conservadas, ...bloque].join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`);

console.log("kid nuevo:", kid);
console.log("claves rotadas en .env.local");
