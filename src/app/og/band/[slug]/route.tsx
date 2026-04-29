import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const band = await db.band
    .findUnique({
      where: { slug },
      include: {
        genres: { include: { genre: true }, take: 4 },
      },
    })
    .catch(() => null);

  if (!band) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0a0a0a",
            color: "#8b0000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
            fontFamily: "Georgia, serif",
          }}
        >
          ⛧ 404 ⛧
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(196,30,30,0.22) 0%, transparent 65%)",
          color: "#e8e4d8",
          padding: "60px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              fontSize: 48,
              color: "#8b0000",
              fontWeight: 900,
            }}
          >
            U.M.
          </span>
          <span
            style={{
              fontSize: 14,
              color: "#7a7a7a",
              textTransform: "uppercase",
              letterSpacing: "0.3em",
            }}
          >
            Encyclopedia
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h1
            style={{
              fontSize: band.name.length > 20 ? 100 : 130,
              lineHeight: 0.95,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.02em",
              textShadow: "0 0 30px rgba(196,30,30,0.4)",
              color: "#e8e4d8",
            }}
          >
            {band.name}
          </h1>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {band.genres.map((g) => (
              <span
                key={g.genreId}
                style={{
                  fontSize: 18,
                  color: "#c41e1e",
                  background: "rgba(196,30,30,0.12)",
                  padding: "6px 14px",
                  border: "1px solid rgba(196,30,30,0.4)",
                  borderRadius: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                {g.genre.name}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #1f1f1f",
            paddingTop: 24,
            fontSize: 22,
            color: "#a8a39a",
            fontFamily: "monospace",
          }}
        >
          <span>
            {band.countryCode ? `[${band.countryCode}]` : "[—]"}
            {band.city ? ` · ${band.city}` : ""}
            {band.formedYear ? ` · est. ${band.formedYear}` : ""}
          </span>
          <span>
            ⚡ {band.heaviness}/10 · ⛧ {band.undergroundScore}/10
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
