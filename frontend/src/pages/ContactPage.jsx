import { useState, useEffect } from "react";
import { Send, Mail, MessageCircle, CheckCircle } from "lucide-react";
import { contactAPI } from "../api/client.ts";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [contactEmail, setContactEmail] = useState("weweebo@gmail.com");

  useEffect(() => {
    contactAPI.getEmail()
      .then((r) => setContactEmail(r.data.email))
      .catch(() => {});
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setSending(true);
    setError("");
    try {
      await contactAPI.send(form);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#edf5e9] to-white">
        <div className="max-w-3xl mx-auto px-5 pt-16 pb-10 text-center">
          <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-[#1c1f1a] tracking-tight mb-3">
            Get in touch
          </h1>
          <p className="text-base text-[#565c52] max-w-md mx-auto">
            Questions, feedback, or just want to say hi — we read every message and reply within 24 hours.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Left — info cards */}
          <div className="md:w-2/5 space-y-4">
            <div className="bg-[#f4f7f2] border border-[#e2e6dc] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-[#edf5e9] flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-[#2e5023]" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1f1a] mb-1">Email us directly</h3>
              <a href={`mailto:${contactEmail}`} className="text-sm text-[#2e5023] font-medium hover:underline">
                {contactEmail}
              </a>
            </div>

            <div className="bg-[#f4f7f2] border border-[#e2e6dc] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1f1a] mb-1">What to include</h3>
              <p className="text-sm text-[#565c52] leading-relaxed">
                For account or billing issues, include the email you use to sign in so we can help faster.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#1c1f1a] mb-1">Response time</h3>
              <p className="text-sm text-[#565c52] leading-relaxed">
                We typically respond within 24 hours. For urgent issues, email us directly.
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="md:w-3/5">
            {sent ? (
              <div className="bg-[#edf5e9] border border-[#d4e8cc] rounded-2xl p-10 text-center">
                <CheckCircle className="w-12 h-12 text-[#4f7942] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1c1f1a] mb-2">Message sent</h3>
                <p className="text-sm text-[#565c52] mb-5">Thanks for reaching out. We'll get back to you soon.</p>
                <button
                  onClick={() => setSent(false)}
                  className="text-sm font-medium text-[#2e5023] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-[#e2e6dc] rounded-2xl p-7 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1c1f1a] mb-1.5">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update("name")}
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 text-sm border border-[#e2e6dc] rounded-xl bg-[#fafcf8] focus:border-[#4f7942] focus:ring-1 focus:ring-[#4f7942] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c1f1a] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 text-sm border border-[#e2e6dc] rounded-xl bg-[#fafcf8] focus:border-[#4f7942] focus:ring-1 focus:ring-[#4f7942] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c1f1a] mb-1.5">Subject <span className="text-[#9aa094] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={update("subject")}
                    placeholder="What's this about?"
                    className="w-full px-4 py-2.5 text-sm border border-[#e2e6dc] rounded-xl bg-[#fafcf8] focus:border-[#4f7942] focus:ring-1 focus:ring-[#4f7942] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c1f1a] mb-1.5">Message</label>
                  <textarea
                    value={form.message}
                    onChange={update("message")}
                    required
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full px-4 py-2.5 text-sm border border-[#e2e6dc] rounded-xl bg-[#fafcf8] focus:border-[#4f7942] focus:ring-1 focus:ring-[#4f7942] outline-none transition-colors resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !form.name || !form.email || !form.message}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#2e5023] text-white text-sm font-semibold rounded-xl hover:bg-[#4f7942] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "Sending..." : <><Send className="w-4 h-4" /> Send message</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
