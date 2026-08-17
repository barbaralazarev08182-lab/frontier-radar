import { TodayR4ExperienceEnhancer } from "./today-r4-experience-enhancer";
import { TodayTearAperturePrototype } from "./today-tear-aperture-prototype";
import "./today-tear-aperture-qa.css";
import "./today-r4-showcase.css";
import "./today-r4-expanded-stage.css";
import "./today-r4-focus-field.css";
import "./today-r4-structure-depth.css";
import "./today-r4-reduction-pass.css";
import "./today-r6-bold-ordered.css";

export const metadata = { title: "Today Tear Aperture QA · Frontier Radar" };

export default function TodayTearAperturePage() {
  return (
    <>
      <TodayTearAperturePrototype />
      <TodayR4ExperienceEnhancer />
    </>
  );
}
