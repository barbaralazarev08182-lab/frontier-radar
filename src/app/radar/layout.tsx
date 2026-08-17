export default function RadarLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`
        main:has(> .radar-route-root) {
          width: 100%;
          max-width: none !important;
          padding: 0 !important;
        }

        .radar-route-root {
          --radar-shell-header-h: 3.5rem;
          width: 100%;
          min-width: 0;
        }

        /* Personal Radar is a single-screen research instrument on desktop.
           The current editorial SiteNav is 56px tall, while the older shared
           system token still says 48px. Bind this route to the real shell so
           the instrument ends exactly at the viewport edge. */
        @media (min-width: 1121px) and (min-height: 700px) {
          html:has(.radar-route-root),
          body:has(.radar-route-root) {
            height: 100%;
            overflow: hidden !important;
          }

          main:has(> .radar-route-root) {
            height: calc(100dvh - var(--radar-shell-header-h));
            min-height: 0;
            overflow: hidden;
          }

          .radar-route-root {
            height: 100%;
            min-height: 0;
            overflow: hidden;
          }

          .radar-route-root article[data-radar-state] {
            box-sizing: border-box;
            width: 100%;
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .radar-route-root article[data-radar-state] > header {
            box-sizing: border-box;
            padding-inline: .45rem;
          }

          .radar-route-root article[data-radar-state] > header > div:first-child {
            margin-left: 0 !important;
            min-width: 0;
          }

          .radar-route-root article[data-radar-state] > header > div:last-child {
            margin-right: 0 !important;
            min-width: 0;
          }

          .radar-route-root article[data-radar-state] > section:not([aria-label="Personal Radar model status"]) {
            min-height: 0 !important;
            overflow: hidden;
          }

          .radar-route-root article[data-radar-state] > footer {
            box-sizing: border-box;
            padding-bottom: .12rem;
          }
        }
      `}</style>
      <div className="radar-route-root">{children}</div>
    </>
  );
}
