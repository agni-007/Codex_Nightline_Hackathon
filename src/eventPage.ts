/**
 * A safe, useful page when a model returns the core content but drops the
 * optional EVENT_PAGE block. The supplied event description is displayed
 * verbatim, so this fallback never introduces new event facts.
 */
export function buildEventPageFallback(rawInput: string): string {
  const description = escapeHtml(rawInput.trim());
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Event details</title>
  <style>
    :root { color-scheme: dark; --ink:#12151b; --panel:#20262f; --accent:#ff5a3c; --text:#f2f4f7; --muted:#b6c0cd; }
    * { box-sizing:border-box; } body { margin:0; background:var(--ink); color:var(--text); font:16px Arial,sans-serif; line-height:1.6; }
    main { width:min(720px, calc(100% - 32px)); margin:0 auto; padding:72px 0; }
    .tag { color:var(--accent); font-weight:700; letter-spacing:.08em; font-size:.78rem; text-transform:uppercase; }
    h1 { font-size:clamp(2.4rem, 9vw, 4.8rem); line-height:1; margin:.35rem 0 1.5rem; }
    .details { background:var(--panel); border:1px solid #353d4a; border-radius:14px; padding:28px; white-space:pre-wrap; color:var(--muted); }
    .note { color:var(--muted); font-size:.9rem; margin-top:24px; }
  </style>
</head>
<body><main>
  <div class="tag">Event details</div>
  <h1>Save the date.</h1>
  <section class="details">${description}</section>
  <p class="note">Please use the details above when planning your visit.</p>
</main></body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
