import { Link } from "react-router-dom";
import {
  ClipboardClock,
  Target,
  TrendingUp,
  Map,
  BookOpen,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import styles from "./FeaturesPage.module.css";

/** Describes product capabilities for the marketing site. */
export default function FeaturesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Features</h1>
        <p className={styles.lead}>
          Everything you need to plan a skill, practice consistently, and see how far you’ve come — without clutter.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.iconWrap}>
            <Map size={22} strokeWidth={1.75} />
          </div>
          <h2>Skill maps</h2>
          <p>
            Lay out your path from a clear start to a concrete goal. Each step is a node you can open, edit, and complete in
            order.
          </p>
        </article>
        <article className={styles.card}>
          <div className={styles.iconWrap}>
            <ClipboardClock size={22} strokeWidth={1.75} />
          </div>
          <h2>Practice sessions</h2>
          <p>Start timed sessions on any node, pause when you need a break, and end with optional quick notes.</p>
        </article>
        <article className={styles.card}>
          <div className={styles.iconWrap}>
            <BookOpen size={22} strokeWidth={1.75} />
          </div>
          <h2>Reflections</h2>
          <p>Capture how the session felt, what you practiced, and what blocked you — so patterns emerge over time.</p>
        </article>
        <article className={styles.card}>
          <div className={styles.iconWrap}>
            <BarChart3 size={22} strokeWidth={1.75} />
          </div>
          <h2>Progress</h2>
          <p>See completion across your map at a glance with a simple progress bar and node states.</p>
        </article>
        <article className={styles.card}>
          <div className={styles.iconWrap}>
            <Target size={22} strokeWidth={1.75} />
          </div>
          <h2>Goals that unlock</h2>
          <p>Finish a step to unlock the next. Locked nodes stay visible so you always know what’s ahead.</p>
        </article>
        <article className={styles.card}>
          <div className={styles.iconWrap}>
            <TrendingUp size={22} strokeWidth={1.75} />
          </div>
          <h2>Steady growth</h2>
          <p>Short, repeatable loops — session, reflect, next step — designed to compound.</p>
        </article>
      </section>

      <section className={styles.note}>
        <Sparkles size={20} className={styles.noteIcon} aria-hidden />
        <p>
          We’re always improving the map experience. Have an idea?{" "}
          <Link to="/contact" className={styles.inlineLink}>
            Tell us on the contact page
          </Link>
          .
        </p>
      </section>

      <div className={styles.cta}>
        <Link to="/signup" className={styles.ctaBtn}>
          Create an account
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
