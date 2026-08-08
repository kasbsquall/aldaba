import { SignJWT, importPKCS8, type JWK } from "jose";

// Portal rechaza tokens anonimos en el inbox (403 anonymous_not_allowed), asi que
// Aldaba emite sus propios JWT y expone un JWKS publico. El bloque `auth` de
// portal.config.ts apunta a ese JWKS y mapea los claims a la identidad de Portal.

const ALG = "RS256";
const TOKEN_TTL = "2h";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/** El issuer tiene que coincidir exactamente con `auth.issuer` en portal.config.ts. */
export function issuer(): string {
  return required("ALDABA_ISSUER").replace(/\/$/, "");
}

export function jwksUrl(): string {
  return `${issuer()}/.well-known/jwks.json`;
}

export function publicJwks(): { keys: JWK[] } {
  return { keys: [JSON.parse(required("ALDABA_JWT_PUBLIC_JWK")) as JWK] };
}

let cachedKey: CryptoKey | Uint8Array | null = null;

async function signingKey() {
  if (!cachedKey) {
    const pem = required("ALDABA_JWT_PRIVATE_KEY").replace(/\\n/g, "\n");
    cachedKey = await importPKCS8(pem, ALG);
  }
  return cachedKey;
}

export interface AldabaIdentity {
  userId: string;
  username: string;
}

/** Emite un token de usuario que Portal acepta en el canal y en el inbox. */
export async function mintToken(identity: AldabaIdentity): Promise<string> {
  return new SignJWT({ name: identity.username })
    .setProtectedHeader({ alg: ALG, kid: required("ALDABA_JWT_KID") })
    .setSubject(identity.userId)
    .setIssuer(issuer())
    .setAudience("portal")
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(await signingKey());
}
