import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so this one is full-bleed.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #9085e9 0%, #5a4bd1 100%)",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#120d33" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v6.5" />
          <path d="m8.75 10.75 3.25 3.25 3.25-3.25" />
        </svg>
      </div>
    ),
    size,
  );
}
