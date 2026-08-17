import { TodaySignalStage } from "./today-signal-stage";
import { TodaySignalStageEnhancer } from "./today-signal-stage-enhancer";
import "./today-signal-stage.css";
import "./today-signal-stage-r15.css";
import "./today-signal-stage-r16.css";
import "./today-signal-stage-r17.css";
import "./today-signal-stage-r18.css";
import "./today-signal-stage-r19.css";

export const metadata = { title: "Today Signal Stage QA · Frontier Radar" };

export default function TodaySignalStagePage() {
  return (
    <>
      <TodaySignalStage />
      <TodaySignalStageEnhancer />
    </>
  );
}
