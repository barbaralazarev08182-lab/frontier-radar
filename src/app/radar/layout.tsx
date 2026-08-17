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
          width: 100%;
          min-width: 0;
        }
      `}</style>
      <div className="radar-route-root">{children}</div>
    </>
  );
}
