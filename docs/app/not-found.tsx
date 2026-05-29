import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem 1rem",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(3rem, 8vw, 6rem)",
          fontWeight: 700,
          margin: 0,
          lineHeight: 1,
          color: "oklch(0.45 0.008 240)",
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: "1.125rem",
          color: "oklch(0.5 0.006 240)",
          margin: "1.5rem 0 2rem",
          maxWidth: "32ch",
        }}
      >
        Page not found
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "0.625rem 1.25rem",
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: "oklch(0.25 0.008 240)",
          backgroundColor: "oklch(0.97 0.005 240)",
          border: "1px solid oklch(0.88 0.006 240)",
          borderRadius: "0.375rem",
          textDecoration: "none",
          transition: "all 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        Back to docs
      </Link>
    </div>
  );
}
