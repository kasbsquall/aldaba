// Genera el par RSA que firma los JWT de Aldaba y sirve el JWKS.
// Se corre una sola vez. La privada va a .env.local (ignorado por git).
import { generateKeyPair, exportPKCS8, exportJWK, calculateJwkThumbprint } from "jose";
import { writeFileSync, existsSync, readFileSync } from "node:fs";

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });

const pkcs8 = await exportPKCS8(privateKey);
const publicJwk = await exportJWK(publicKey);
const kid = await calculateJwkThumbprint(publicJwk);

Object.assign(publicJwk, { kid, use: "sig", alg: "RS256" });

const envPath = ".env.local";
const prev = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const block = [
  `ALDABA_JWT_KID=${kid}`,
  `ALDABA_JWT_PRIVATE_KEY="${pkcs8.trim().replace(/\n/g, "\n")}"`,
  `ALDABA_JWT_PUBLIC_JWK='${JSON.stringify(publicJwk)}'`,
].join("\n");

writeFileSync(envPath, `${prev.trimEnd()}\n${block}\n`.trimStart());
console.log("kid:", kid);
console.log("claves escritas en .env.local");
