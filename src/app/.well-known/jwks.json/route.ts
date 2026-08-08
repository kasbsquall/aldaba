import { publicJwks } from "@/lib/identity";

// Portal lee este endpoint para verificar los JWT que emite Aldaba.
// Tiene que ser publico, estable y servido sobre HTTPS.

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return Response.json(publicJwks(), {
    headers: { "cache-control": "public, max-age=3600, must-revalidate" },
  });
}
