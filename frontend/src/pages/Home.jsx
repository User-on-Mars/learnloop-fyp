import { Link } from "react-router-dom";
import { ClipboardClock, Target, TrendingUp, ArrowRight } from "lucide-react";
import styles from "./Home.module.css";

/** Logged-out landing content (shell is MarketingLayout). */
export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Welcome</h1>
          <p className={styles.heroSubtitle}>To your skill journey</p>
          <p className={styles.heroText}>
            Map your goals, practice with intention, and see progress in one place.
          </p>
          <Link to="/signup" className={styles.heroCta}>
            Get started
          </Link>
          <div>
            <Link to="/login" className={styles.heroSecondary}>
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className={styles.featuresTitle}>What you can do</h2>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ClipboardClock size={20} strokeWidth={1.5} />
              </div>
              <h3>Track progress</h3>
              <p>Sessions and reflections in one timeline.</p>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Target size={20} strokeWidth={1.5} />
              </div>
              <h3>Map goals</h3>
              <p>Break a big goal into clear steps.</p>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <TrendingUp size={20} strokeWidth={1.5} />
              </div>
              <h3>Grow over time</h3>
              <p>Small habits that compound.</p>
            </article>
          </div>
          <p className={styles.featuresMore}>
            <Link to="/features" className={styles.featuresMoreLink}>
              View all features
              <ArrowRight size={16} aria-hidden />
            </Link>
          </p>
        </div>
      </section>

      <section className={styles.aboutSection}>
        <div className={styles.aboutInner}>
          <h2 className={styles.featuresTitle}>About</h2>
          <p className={styles.aboutText}>
            LearnLoop is for people who want structure without noise. Plan your path, log practice, and reflect — simply.
          </p>
          <Link to="/about" className={styles.textLink}>
            Read more about us
          </Link>
        </div>
      </section>

      <section className={styles.ctaBand}>
        <h2>Start your map</h2>
        <div className={styles.ctaRow}>
          <Link to="/signup" className={styles.ctaButton}>
            Create an account
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link to="/contact" className={styles.ctaGhost}>
            Contact
          </Link>
        </div>
      </section>
    </div>
  );
}
