import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LogoMark from "../components/LogoMark";
import styles from "./MarketingLayout.module.css";

/** Wraps public marketing pages with shared header, logo, nav, and footer. */
export default function MarketingLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navClass = ({ isActive }) =>
    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logoLink} onClick={closeMenu}>
            <LogoMark size={36} className={styles.logoImg} />
            <span className={styles.logoText}>LearnLoop</span>
          </Link>

          <nav className={styles.navDesktop} aria-label="Primary">
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
            <NavLink to="/features" className={navClass}>
              Features
            </NavLink>
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={navClass}>
              Contact
            </NavLink>
          </nav>

          <div className={styles.headerActions}>
            <Link to="/login" className={styles.linkQuiet}>
              Log in
            </Link>
            <Link to="/signup" className={styles.btnPrimary}>
              Sign up
            </Link>
          </div>

          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className={styles.menuIcon} strokeWidth={2} /> : <Menu className={styles.menuIcon} strokeWidth={2} />}
          </button>
        </div>

        {menuOpen && (
          <div className={styles.mobileMenu}>
            <NavLink to="/" end className={navClass} onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/features" className={navClass} onClick={closeMenu}>
              Features
            </NavLink>
            <NavLink to="/about" className={navClass} onClick={closeMenu}>
              About
            </NavLink>
            <NavLink to="/contact" className={navClass} onClick={closeMenu}>
              Contact
            </NavLink>
            <div className={styles.mobileAuth}>
              <Link to="/login" className={styles.btnPrimary} onClick={closeMenu}>
                Log in
              </Link>
              <Link to="/signup" className={styles.btnPrimary} onClick={closeMenu}>
                Sign up
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <LogoMark size={28} className={styles.footerLogo} />
            <span>LearnLoop</span>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/features">Features</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Log in</Link>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} LearnLoop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
