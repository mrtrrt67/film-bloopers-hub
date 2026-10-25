import { ImageResponse } from "next/og";

export const alt = "FilmBloopers Hub | Il Portale Italiano degli Errori nei Film";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage: "radial-gradient(circle at 50% 30%, #1f1406 0%, #09090b 70%)",
          fontFamily: "sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* Subtle grid border decoration */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: 24,
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            padding: "8px 20px",
            borderRadius: 999,
            marginBottom: 32,
          }}
        >
          <span style={{ color: "#f59e0b", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
            L'ARCHIVIO UFFICIALE DEGLI ERRORI NEI FILM
          </span>
        </div>

        {/* Logo Title */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: -1,
            }}
          >
            FilmBloopers
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#f59e0b",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Hub
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 880,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Oltre 1.000 bloopers, ciak falsi, anacronismi storici e troupe visibili al minuto esatto.
        </p>

        {/* Footer Metrics */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#f59e0b" }}>219+</span>
            <span style={{ fontSize: 14, color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>Film Catalogati</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#f59e0b" }}>1.000+</span>
            <span style={{ fontSize: 14, color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>Errori Verificati</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#f59e0b" }}>100%</span>
            <span style={{ fontSize: 14, color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>Gratuito & Italiano</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
