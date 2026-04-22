import { Router } from 'express';
import NotificationService from '../services/NotificationService.js';
import ErrorLoggingService from '../services/ErrorLoggingService.js';
import XpSettings from '../models/XpSettings.js';

const router = Router();

/**
 * GET /api/contact/email
 * Public — returns the contact email for display on the contact page.
 */
router.get('/email', async (req, res) => {
  try {
    const settings = await XpSettings.getSettings();
    res.json({ email: settings.contactEmail || 'weweebo@gmail.com' });
  } catch {
    res.json({ email: 'weweebo@gmail.com' });
  }
});

/**
 * POST /api/contact
 * Public — sends the message to the admin contact email.
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Get the admin contact email from settings
    const settings = await XpSettings.getSettings();
    const adminEmail = settings.contactEmail || process.env.CONTACT_EMAIL || 'weweebo@gmail.com';
    const subjectLine = subject ? `[LearnLoop Contact] ${subject}` : `[LearnLoop Contact] Message from ${name}`;

    const text = `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || 'N/A'}\n\nMessage:\n${message}`;
    const html = `
      <div style="font-family:sans-serif;max-width:500px;">
        <h3 style="color:#2e5023;">New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
        <hr style="border:none;border-top:1px solid #e2e6dc;margin:16px 0;" />
        <p style="white-space:pre-wrap;">${message}</p>
      </div>
    `.trim();

    try {
      await NotificationService._ensureTransport();
      if (NotificationService.transporter) {
        await NotificationService.transporter.sendMail({
          from: process.env.SMTP_FROM || 'LearnLoop <no-reply@learnloop.local>',
          to: adminEmail,
          replyTo: email,
          subject: subjectLine,
          text,
          html,
        });
      } else {
        console.log('[DEV CONTACT]', { to: adminEmail, name, email, subject, message });
      }
    } catch (emailErr) {
      console.error('Failed to send contact email:', emailErr.message);
    }

    await ErrorLoggingService.logSystemEvent('contact_form_submission', {
      name, email, subject: subject || null,
      sentTo: adminEmail,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    });

    res.json({ ok: true, message: "Message received. We'll get back to you soon." });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again.' });
  }
});

export default router;
