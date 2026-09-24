import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
        <svg
          width="300"
          height="300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0d0b1f"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19h16" />
          <path d="M6 15l4-4 3 3 5-6" />
        </svg>
      </div>
    ),
    size,
  );
}
