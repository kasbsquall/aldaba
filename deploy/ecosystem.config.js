// Aldaba en el VPS. Escucha SOLO en 127.0.0.1: el unico que habla con internet es
// el reverse proxy. Y lleva tope de memoria porque esta maquina ya corre correo y
// apps de clientes con poca RAM libre; sin tope, un proceso que se dispare se los
// lleva por delante.
module.exports = {
  apps: [{
    name: "aldaba",
    script: "server.js",
    cwd: "/opt/aldaba",
    env: { NODE_ENV: "production", PORT: "8330", HOSTNAME: "127.0.0.1" },
    max_memory_restart: "420M",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
  }],
};
