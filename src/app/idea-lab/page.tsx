import { IdeaLabWorkbench } from "./idea-lab-workbench";
import "./idea-lab-composition.css";

export const metadata = {
  title: "Idea Lab · Frontier Radar",
  description: "Turn saved frontier signals into working directions.",
};

export default function IdeaLabPage() {
  return <IdeaLabWorkbench />;
}
