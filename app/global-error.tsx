"use client";
/** Last-resort error page (when the main layout itself fails). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center", color: "#0b1b3a" }}>
        <h1>Something went wrong</h1>
        <p>Please try again in a moment.</p>
        {error.digest && <p style={{ fontSize: 12, color: "#4a6290" }}>Code: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#0b8679", color: "#fff", fontWeight: 600 }}>Try again</button>
      </body>
    </html>
  );
}
