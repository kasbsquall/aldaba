"use client";

import { useEffect, useState } from "react";
import { Portal } from "@portalsdk/core";
import { PortalProvider } from "@portalsdk/react";

// Quien abre la URL recibe identidad al vuelo, sin registro ni login. El jurado
// tiene que poder abrir el enlace y estar dentro del producto de inmediato.
//
// El token va como callback en el constructor, no con setToken despues de montar.
// Con setToken el cliente ya intento conectarse como anonimo, y como el canal exige
// identidad, la carga del historial devuelve 401: quien abre la URL con la sala ya
// corriendo se queda sin ver nada de lo anterior, que es justo el caso que importa.
// El callback ademas se reinvoca al reconectar y al expirar el token.

let identidadCache: Identidad | null = null;

async function traerToken(): Promise<string> {
  const r = await fetch("/api/portal-token", { credentials: "include" });
  if (!r.ok) throw new Error(`portal-token: HTTP ${r.status}`);
  const { token, identidad } = (await r.json()) as {
    token: string;
    identidad: Identidad;
  };
  identidadCache = identidad;
  return token;
}

const portal = new Portal({
  apiKey: process.env.NEXT_PUBLIC_PORTAL_KEY!,
  token: traerToken,
});

export interface Identidad {
  id: string;
  nombre: string;
  rol: string;
}

export function Proveedor({
  children,
}: {
  children: (identidad: Identidad | null) => React.ReactNode;
}) {
  const [identidad, setIdentidad] = useState<Identidad | null>(identidadCache);

  useEffect(() => {
    let vigente = true;
    // El token ya lo pide el cliente por su cuenta; esto solo trae el nombre para
    // poder rotularlo en pantalla.
    void fetch("/api/portal-token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vigente && d?.identidad) setIdentidad(d.identidad as Identidad);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  return <PortalProvider client={portal}>{children(identidad)}</PortalProvider>;
}
