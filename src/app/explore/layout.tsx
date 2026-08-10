export default function ExploreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`
        main:has(> .explore-route-root) {
          width: 100%;
          max-width: none !important;
          padding: 0 !important;
        }

        .explore-route-root {
          width: 100%;
          min-width: 0;
          overflow: clip;
        }

        .explore-route-root > .explore-field-shell {
          width: 100% !important;
          margin: 0 !important;
        }
      `}</style>
      <div className="explore-route-root">{children}</div>
    </>
  );
}
