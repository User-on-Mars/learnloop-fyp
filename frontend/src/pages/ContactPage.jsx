import { useState } from "react";
import { Mail, MessageSquare, Send } from "lucide-react";
import { useToast } from "../context/ToastContext";
import styles from "./ContactPage.module.css";

/** Contact form — client-side only; shows a confirmation toast on submit. */
export default function ContactPage() {
  const { showSuccess } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSending(true);
    window.setTimeout(() => {
      showSuccess("Thanks — we’ve received your message and will get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
      setSending(false);
    }, 400);
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Contact</h1>
        <p className={styles.lead}>
          Ask a question, share feedback, or say hello. We read every message.
        </p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div className={styles.asideBlock}>
            <Mail size={20} className={styles.asideIcon} aria-hidden />
            <div>
              <strong>Email</strong>
              <a href="mailto:hello@learnloop.app" className={styles.asideLink}>
                hello@learnloop.app
              </a>
            </div>
          </div>
          <p className={styles.asideNote}>
            For account or billing issues, include the email you use to sign in so we can help faster.
          </p>
        </aside>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.label}>
            Name
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              autoComplete="name"
              required
              placeholder="Your name"
            />
          </label>
          <label className={styles.label}>
            Email
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label className={styles.label}>
            Message
            <textarea
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={styles.textarea}
              rows={5}
              required
              placeholder="How can we help?"
            />
          </label>
          <button type="submit" className={styles.submit} disabled={sending}>
            {sending ? (
              "Sending…"
            ) : (
              <>
                <Send size={18} aria-hidden />
                Send message
              </>
            )}
          </button>
        </form>
      </div>

      <p className={styles.footerHint}>
        <MessageSquare size={16} className={styles.hintIcon} aria-hidden />
        This form is a demo in the app preview. Wire it to your API or Formspree when you deploy.
      </p>
    </div>
  );
}
