/**
 * Auto-generated Open Graph image for an article.
 *
 * Renders a 1200x630 PNG via @vercel/og (Satori). The image mirrors the
 * site's brand: deep ash background, blood-red title accent, blackletter U.M.
 * mark in the corner.
 *
 * Cached for an hour at the edge — articles rarely change after publish.
 */

import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const article = await db.article
    .findUnique({
      where: { slug },
      select: {
        title: true,
        subtitle: true,
        type: true,
        rating: true,
        author: { select: { username: true, name: true } },
        bands: {
          take: 3,
          include: { band: { select: { name: true } } },
        },
      },
    })
    .catch(() => null);

  if (!article) {
    return new ImageResponse(<NotFound />, { width: 1200, height: 630 });
  }

  const author = article.author.username ?? article.author.name ?? "anon";
  const bandList = article.bands.map((b) => b.band.name).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(196,30,30,0.18) 0%, transparent 60%)",
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
              letterSpacing: "-0.02em",
            }}
          >
            U.M.
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 14,
                color: "#7a7a7a",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
              }}
            >
              Underground Metal
            </span>
            <span
              style={{
                fontSize: 14,
                color: "#c41e1e",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
              }}
            >
              {article.type.toLowerCase().replace("_", " ")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1
            style={{
              fontSize: article.title.length > 60 ? 56 : 72,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "#e8e4d8",
              maxWidth: 1040,
            }}
          >
            {article.title}
          </h1>
          {article.subtitle && (
            <p
              style={{
                fontSize: 28,
                color: "#a8a39a",
                margin: 0,
                lineHeight: 1.3,
                maxWidth: 1040,
              }}
            >
              {article.subtitle}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #1f1f1f",
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 22, color: "#a8a39a" }}>
            by <span style={{ color: "#e8e4d8" }}>{author}</span>
            {bandList && (
              <span style={{ color: "#7a7a7a" }}> · {bandList}</span>
            )}
          </span>
          {article.rating != null && (
            <span
              style={{
                fontSize: 28,
                color: "#c41e1e",
                fontFamily: "monospace",
              }}
            >
              {article.rating}/100
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function NotFound() {
  return (
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
  );
}
