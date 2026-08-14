import { PersonalRadarClient } from "./personal-radar-client";

export const metadata = {
  title: "Personal Radar · Frontier Radar",
  description: "A truthful view of the behavioral evidence currently shaping your Frontier Radar profile.",
};

export default function PersonalRadarPage() {
  return <PersonalRadarClient />;
}
