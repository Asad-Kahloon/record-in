import "server-only";

import { ImageResponse } from "next/og";

import { APP_NAME } from "@/lib/constants";

/** The RecordIn mark (ring and arrow) — the same drawing as src/app/icon.tsx. */
function Mark({ size, stroke, color }: { size: number; stroke: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v6.5" />
      <path d="m8.75 10.75 3.25 3.25 3.25-3.25" />
    </svg>
  );
}

async function png(element: React.ReactElement, width: number, height: number): Promise<Buffer> {
  const response = new ImageResponse(element, { width, height });
  return Buffer.from(await response.arrayBuffer());
}

/** Square app logo for report headers. */
export function logoPng(size = 160): Promise<Buffer> {
  return png(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.22,
        background: "linear-gradient(135deg, #9085e9 0%, #5a4bd1 100%)",
      }}
    >
      <Mark size={size * 0.6} stroke={2.2} color="#120d33" />
    </div>,
    size,
    size,
  );
}

/**
 * A see-through tile with a faint, tilted RecordIn mark. Spreadsheets repeat it
 * behind the cells as a watermark.
 */
export function watermarkPng(): Promise<Buffer> {
  return png(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          transform: "rotate(-24deg)",
          color: "rgba(91, 79, 214, 0.075)",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        <Mark size={84} stroke={2.4} color="rgba(91, 79, 214, 0.075)" />
        {APP_NAME}
      </div>
    </div>,
    720,
    420,
  );
}
