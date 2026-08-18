import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
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
          background: "#0a0a0a",
          borderRadius: 7,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 7.5 12 16M12 5.5 12 16M18 7.5 12 16"
            stroke="#f5f1e8"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.55"
          />
          <circle cx="6" cy="7.5" r="2.1" fill="#f5f1e8" opacity="0.55" />
          <circle cx="12" cy="5.5" r="2.1" fill="#f5f1e8" opacity="0.55" />
          <circle cx="18" cy="7.5" r="2.1" fill="#f5f1e8" opacity="0.55" />
          <circle cx="12" cy="17.5" r="3.4" fill="#ff5a1f" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
