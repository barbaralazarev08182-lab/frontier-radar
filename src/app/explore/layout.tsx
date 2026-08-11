import "./field/field-first.css";
import "./field/kraft-material-pass.css";
import "./field/interaction-cohesion-pass.css";
import "./field/final-polish-pass.css";
import "./field/motion-depth-pass.css";
import "./field/pointer-response-pass.css";
import { FieldMotionBridge } from "./field/field-motion-bridge";

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
      `}</style>
      <div className="explore-route-root">
        <FieldMotionBridge>{children}</FieldMotionBridge>
      </div>
    </>
  );
}
