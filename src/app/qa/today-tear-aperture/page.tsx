import { TodayR4ExperienceEnhancer } from "./today-r4-experience-enhancer";
import { TodayTearAperturePrototype } from "./today-tear-aperture-prototype";
import "./today-tear-aperture-qa.css";
import "./today-r4-showcase.css";
import "./today-r4-expanded-stage.css";

export const metadata = { title: "Today Tear Aperture QA · Frontier Radar" };

export default function TodayTearAperturePage() {
  return (
    <>
      <TodayTearAperturePrototype />
      <TodayR4ExperienceEnhancer />
    </>
  );
}
