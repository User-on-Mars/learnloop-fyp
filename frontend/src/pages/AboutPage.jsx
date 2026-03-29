import { Link } from "react-router-dom";
import { Heart, Compass, Users, ArrowRight } from "lucide-react";
import styles from "./AboutPage.module.css";

/** Mission and values for the marketing site. */
export default function AboutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>About LearnLoop</h1>
        <p className={styles.lead}>
          We believe learning works best when it’s visible, kind, and yours. No noisy feeds — just your path, your practice,
          and honest reflection.
        </p>
      </header>

      <section className={styles.story}>
        <h2 className={styles.sectionTitle}>Why we built it</h2>
        <p>
          Most tools optimize for engagement metrics. We wanted something quieter: a place to map what you’re trying to learn,
          show up for short sessions, and see the next step unlock. LearnLoop is for students, self-taught builders, and anyone
          who learns in the real world — not only in a classroom.
        </p>
      </section>

      <section className={styles.values}>
        <h2 className={styles.sectionTitle}>What we care about</h2>
        <ul className={styles.valueList}>
          <li>
            <div className={styles.valueIcon}>
              <Compass size={20} strokeWidth={1.75} />
            </div>
            <div>
              <strong>Clarity</strong>
              <span>One map, one direction. You always know what’s next.</span>
            </div>
          </li>
          <li>
            <div className={styles.valueIcon}>
              <Heart size={20} strokeWidth={1.75} />
            </div>
            <div>
              <strong>Reflection</strong>
              <span>Understanding how you felt and what blocked you matters as much as checking boxes.</span>
            </div>
          </li>
          <li>
            <div className={styles.valueIcon}>
              <Users size={20} strokeWidth={1.75} />
            </div>
            <div>
              <strong>Your pace</strong>
              <span>No streak shaming. Progress is allowed to be uneven.</span>
            </div>
          </li>
        </ul>
      </section>

      <div className={styles.cta}>
        <p className={styles.ctaText}>Questions or ideas? We’d love to hear from you.</p>
        <Link to="/contact" className={styles.ctaBtn}>
          Contact us
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
