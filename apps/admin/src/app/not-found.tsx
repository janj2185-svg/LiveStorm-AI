import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}>Page not found</h1>
      <p style={{ color: "var(--ink-soft)" }}>This route does not exist in the SYLORA admin console.</p>
      <Link href="/" style={{ color: "var(--violet-deep)", fontWeight: 600 }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
