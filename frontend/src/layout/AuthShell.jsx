import { Link } from "react-router-dom";
import LogoMark from "../components/LogoMark";
import styles from "./AuthShell.module.css";

/** Centered auth pages with the same logo and palette as marketing. */
export function AuthShell({ children }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logoLink}>
            <LogoMark size={36} className={styles.logoImg} />
            <span className={styles.logoText}>LearnLoop</span>
          </Link>
          <Link to="/" className={styles.navHome}>
            Home
          </Link>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
