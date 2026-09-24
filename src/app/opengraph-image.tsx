import { ImageResponse } from "next/og";

import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${APP_NAME} — ${APP_TAGLINE}`;

// Social preview card (also used as the Twitter image).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #14122e 0%, #0a0a0d 55%, #131316 100%)",
          color: "#f4f4f6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 28,
              background: "linear-gradient(135deg, #9085e9 0%, #5a4bd1 100%)",
            }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#120d33" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5v6.5" />
              <path d="m8.75 10.75 3.25 3.25 3.25-3.25" />
            </svg>
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>{APP_NAME}</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1, maxWidth: 900 }}>
          {`${APP_TAGLINE} — income, expenses, borrowing and budgets.`}
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#9d9da8", maxWidth: 860, lineHeight: 1.4 }}>{APP_DESCRIPTION}</div>
      </div>
    ),
    size,
  );
}
