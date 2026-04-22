import { Link } from "react-router-dom";
import LogoMark from "../components/LogoMark";
import styles from "./AuthShell.module.css";

/** Centered auth pages — logo far left, Home link far right. */
export function AuthShell({ children }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logoLink}>
            <LogoMark size={48} className={styles.logoImg} />
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
