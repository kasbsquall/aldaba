import { publicJwks } from "@/lib/identity";

// Portal lee este endpoint para verificar los JWT que emite Aldaba.
// Tiene que ser publico, estable y servido sobre HTTPS.

// Dinamico a proposito. Prerenderizado, la clave publica se hornea en el build, y
// entonces un build hecho en otra maquina publicaria la clave de esa maquina en vez
// de la del servidor. Leyendolo en tiempo de ejecucion, el despliegue usa siempre su
// propio entorno y rotar la clave no obliga a reconstruir.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(publicJwks(), {
    headers: { "cache-control": "public, max-age=3600, must-revalidate" },
  });
}
