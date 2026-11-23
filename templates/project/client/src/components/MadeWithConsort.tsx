// Fixed "Made with Consort" attribution footer, shipped into EVERY Consort-built
// single-page app. This is kit-owned chrome (identical in every app), not a feature
// surface, so it lives in components/ (outside the pages/ the ux-adherence gate scans)
// and carries no design-guide class vocabulary.
//
// The Consort wordmark lockup is served from client/public/ (consort-lockup.svg +
// consort-lockup-white.svg). WHICH variant renders is driven by the --consort-lockup
// token in theme.css, which consort-apply-design-theme sets to contrast with the app's
// OWN page surface (white wordmark on a dark theme, dark wordmark on light) — these apps
// each have one palette, so surface luminance, not the viewer's OS theme, is the signal.
// Styled from design tokens with literal fallbacks so it stays legible under any guide
// (and pre-apply, on the scaffold baseline). Only the "Made with" label is muted; the
// lockup is kept at full opacity so the mark stays crisp.
//
// Pinned CENTER-BOTTOM: full width (so justify-center centers across the whole viewport)
// and `margin-top: auto`, which pushes the footer to the bottom of App's flex-column
// app-shell (min-height: 100vh) on short pages, and lets it sit naturally after the
// content on tall ones. Self-contained chrome — depends on no stylesheet.
export function MadeWithConsort() {
  return (
    <footer
      data-testid="made-with-consort"
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        marginTop: "auto",
        padding: "var(--space-6, 24px)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        fontSize: "var(--text-xs, 12px)",
      }}
    >
      <a
        href="https://github.com/databricks-solutions/consort"
        target="_blank"
        rel="noreferrer noopener"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2, 8px)",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <span style={{ color: "var(--color-text, #1b3139)", opacity: 0.6 }}>Made with</span>
        <span
          role="img"
          aria-label="Consort"
          style={{
            display: "inline-block",
            height: "var(--text-lg, 20px)",
            aspectRatio: "232 / 82",
            backgroundImage: 'var(--consort-lockup, url("/consort-lockup.svg"))',
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
      </a>
    </footer>
  );
}
