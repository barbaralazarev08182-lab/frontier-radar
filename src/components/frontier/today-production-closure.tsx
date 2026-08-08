import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./today-production-closure.module.css";

export function TodayProductionClosure() {
  return (
    <section className={styles.closure} aria-label="Continue exploring Frontier Radar">
      <div>
        <span>FR / CONTINUE THE RADAR</span>
        <p>THE DAILY BRIEF ENDS HERE. THE FRONTIER DOESN&apos;T.</p>
      </div>
      <Link href="/explore">
        EXPLORE THE FULL RADAR <ArrowUpRight aria-hidden="true" />
      </Link>
    </section>
  );
}
