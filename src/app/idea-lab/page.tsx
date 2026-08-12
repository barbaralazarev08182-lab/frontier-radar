import { IdeaLabWorkbench } from "./idea-lab-workbench";
import "./idea-lab-composition.css";

export const metadata = {
  title: "Idea Lab · Frontier Radar",
  description: "Turn saved frontier signals into working directions.",
};

export default async function IdeaLabPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawFrom = Array.isArray(params.from) ? params.from[0] : params.from;
  const initialSourceId = rawFrom?.trim() || null;

  return <IdeaLabWorkbench initialSourceId={initialSourceId} />;
}
