import "./field-first.css";
import "./kraft-material-pass.css";
import "./interaction-cohesion-pass.css";
import "./final-polish-pass.css";
import "./motion-depth-pass.css";

export default function ExploreFieldFirstLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="explore-field-first">{children}</div>;
}
