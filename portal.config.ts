import { defineConfig, allow, block } from "@portalsdk/config";

// Configuracion de Portal para Aldaba. Se despliega con `npx portal deploy`.
//
// Ojo con el ciclo de despliegue: los canales con conexiones vivas conservan su
// configuracion hasta que reinician, y solo las conexiones nuevas toman la version
// recien desplegada. Despues de cada deploy hay que reconectar los clientes antes de
// dar por buena una prueba.

// Este archivo se empaqueta y corre en el borde de Portal, no en tu maquina: aqui
// `process.env` no tiene nada de tu .env.local. El issuer va como literal y se
// mantiene sincronizado con ALDABA_ISSUER corriendo `npm run portal:deploy`, que
// reescribe la linea de abajo antes de desplegar.
const ISSUER = "https://aldaba.107-172-6-206.sslip.io"; // aldaba:issuer

export default defineConfig({
  // Portal no documenta un flujo publico para acuñar sus propios tokens, pero si
  // documenta como verificar los nuestros. Aldaba firma con RS256 y publica el JWKS.
  auth: {
    issuer: ISSUER,
    jwksUrl: `${ISSUER}/.well-known/jwks.json`,
    claimMap: {
      userId: "sub",
      username: "name",
    },
  },

  channels: {
    "aldaba-case-*": {
      mode: "standard",

      // El inbox rechaza tokens anonimos, asi que un anonimo en el canal nunca
      // podria recibir un toque y se quedaria esperando sin señal de error clara.
      anonymous: false,

      // Decisivo. Omitido, `anonymous: false` cae por defecto en "membership", y en
      // un canal de membresia un envio con `to:` a alguien sin fila falla con
      // `not_member`. Con "authz" el callback decide y une al usuario en el acto,
      // sin necesidad de dar de alta a nadie por adelantado. Toda la mecanica de
      // escalamiento depende de esto.
      access: "authz",

      authz: (ctx) => {
        if (ctx.claims.anon) {
          return block("Aldaba necesita una identidad para poder tocarte la puerta.");
        }
        return allow({ publish: true, sendDirect: true });
      },

      // Solo los toques se convierten en notificacion. Si esto devolviera un
      // descriptor para cualquier mensaje, cada paso del razonamiento del agente
      // acabaria en el inbox de alguien.
      notify: (ctx) => {
        if (ctx.message.type !== "aldaba.knock") return null;

        const k = ctx.message.content as {
          caseId: string;
          resumen: string;
          intento: number;
          deadline: string;
          to: string;
        };
        if (!k.to) return null;

        // El destinatario se lee del contenido, no del `to` del envelope, y eso es
        // deliberado. Un mensaje con `to` en el envelope solo se entrega a esa
        // persona, asi que el tablero se quedaria sin ver los toques dirigidos a los
        // demas y la cadena de escalamiento seria invisible justo para quien mira.
        //
        // El toque viaja publico para que todo el canal lo vea, y el descriptor
        // dirige la notificacion a una sola persona con su propio `to`.
        return {
          title: `Aprobación requerida: ${k.resumen}`,
          data: { caseId: k.caseId, intento: k.intento, deadline: k.deadline },
          to: [k.to],
        };
      },
    },
  },
});
