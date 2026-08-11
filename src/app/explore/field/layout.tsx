import "./field-first.css";
import "./kraft-material-pass.css";
import "./interaction-cohesion-pass.css";
import "./final-polish-pass.css";
import "./motion-depth-pass.css";
import "./pointer-response-pass.css";
import { FieldMotionBridge } from "./field-motion-bridge";

export default function ExploreFieldFirstLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="explore-field-first">
      <FieldMotionBridge>{children}</FieldMotionBridge>
    </div>
  );
}
