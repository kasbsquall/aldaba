# Despliegue

Aldaba corre como proceso largo, no en serverless.

El orquestador mantiene temporizadores reales, estado en memoria y conexiones
WebSocket vivas a Portal. En una funcion serverless el proceso se congela al
responder: los `setTimeout` no disparan, el singleton de sesiones no persiste y el
escalamiento deja de ocurrir. Vercel y equivalentes quedan descartados por diseno,
no por preferencia.

## Forma del despliegue

- `output: "standalone"` en `next.config.ts`, para construir fuera y subir el
  resultado. El VPS tiene poca RAM libre y ya corre correo y apps de clientes: un
  build de Next alli puede empujarlos a swap.
- pm2 con `max_memory_restart` para que un proceso desbocado no se lleve la maquina.
- El servidor escucha **solo en `127.0.0.1:8330`**. Lo unico que habla con internet
  es el reverse proxy. Ningun puerto nuevo queda expuesto.
- Reverse proxy de LiteSpeed hacia ese puerto, con el mismo patron que los demas
  proyectos de la maquina.

## Publicar una version nueva

```bash
npm run build
tar -czf /tmp/aldaba.tgz -C .next/standalone .
scp /tmp/aldaba.tgz root@SERVIDOR:/tmp/
ssh root@SERVIDOR 'cd /opt/aldaba && tar -xzf /tmp/aldaba.tgz && pm2 restart aldaba --update-env'
```

Antes de subir hay que copiar `.next/static` y `public` dentro de `.next/standalone`,
que Next no los incluye.

## Al cambiar la URL publica

`ALDABA_ISSUER` en `/opt/aldaba/.env` tiene que coincidir con la URL real, porque
Portal alcanza el JWKS desde ahi para verificar los tokens. Despues hay que correr
`npm run portal:deploy`, que sincroniza el issuer en `portal.config.ts` y lo publica,
y registrar el origen con `npx portal origins add https://LA-URL --env ENV_ID` para
que la `pk_` funcione desde ese navegador.

Ojo con el ciclo: los canales con conexiones vivas conservan la configuracion
anterior hasta que reinician. Tras cada deploy hay que reconectar los clientes antes
de dar por buena una prueba.
