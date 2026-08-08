import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta el servidor con solo las dependencias que usa, para poder subir el
  // build ya hecho en vez de compilar en el VPS. Esa maquina tiene 3 GB libres y
  // 3 GB ya en swap: un build de Next alli puede empujar a swap el correo y las
  // apps de clientes que ya corren.
  output: "standalone",
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
