import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

function Mark({ stroke }: { stroke: number }) {
  return (
    <svg width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="#120d33" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v6.5" />
      <path d="m8.75 10.75 3.25 3.25 3.25-3.25" />
    </svg>
  );
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 112,
          background: "linear-gradient(135deg, #9085e9 0%, #5a4bd1 100%)",
        }}
      >
        <Mark stroke={2.2} />
      </div>
    ),
    size,
  );
}
