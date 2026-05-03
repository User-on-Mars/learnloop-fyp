import nodemailer from 'nodemailer';
import ErrorLoggingService from './ErrorLoggingService.js';

/**
 * NotificationService - Handles in-app and email notifications
 * Requirements: 31.1-31.6
 */
class NotificationService {
  constructor() {
    this.transporter = null;
    this._initialized = false;
  }

  /**
   * Initialize email transport with SMTP configuration (lazy - called on first use)
   * @private
   */
  _ensureTransport() {
    if (this._initialized) return;
    this._initialized = true;

    if (process.env.SMTP_HOST) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        console.log('✅ Email transport initialized');
      } catch (error) {
        console.error('❌ Failed to initialize email transport:', error.message);
        this.transporter = null;
      }
    } else {
      console.log('ℹ️  SMTP not configured - email notifications will be logged only');
    }
  }

  /**
   * Send an email notification
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} text - Plain text content
   * @param {string} html - HTML content
   * @returns {Promise<Object>} Email send result
   * @private
   */
  async _sendEmail(to, subject, text, html) {
    try {
      this._ensureTransport();

      // If SMTP not configured, log to console (dev mode)
      if (!this.transporter) {
        console.log('[DEV EMAIL]', {
          to,
          subject,
          text,
          html
        });
        return { devMode: true, to, subject };
      }

      // Send email via SMTP
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'LearnLoop <no-reply@learnloop.local>',
        to,
        subject,
        text,
        html
      });

      await ErrorLoggingService.logSystemEvent('email_sent', {
        to,
        subject,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        to,
        subject,
        operation: 'sendEmail',
        timestamp: new Date().toISOString()
      });

      // Don't throw - email failures should not break the main flow
      console.error('Failed to send email:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send in-app notification - stores in database for user to view
   * @param {string} userId - User ID to notify
   * @param {Object} notification - Notification data with type, title, message, data
   * @returns {Promise<Object>} Notification result
   * @private
   */
  async _sendInAppNotification(userId, notification) {
    try {
      const Notification = (await import('../models/Notification.js')).default;

      // Generate title and message based on notification type
      let title = '';
      let message = '';

      switch (notification.type) {
        case 'publish_request_approved':
          title = 'Skillmap Published';
          message = `Your skillmap "${notification.skillmapName}" is now live in the Templates gallery.`;
          break;
        case 'publish_request_rejected':
          title = 'Skillmap Review Update';
          message = `Your skillmap "${notification.skillmapName}" was not approved. ${notification.adminNote || 'Please review and resubmit.'}`;
          break;
        case 'room_invitation_received':
          title = 'Room Invitation';
          message = `${notification.invitedBy} invited you to join "${notification.roomName}"`;
          break;
        case 'room_invitation_accepted':
          title = 'Invitation Accepted';
          message = `${notification.acceptedBy} accepted your invitation to "${notification.roomName}"`;
          break;
        case 'room_invitation_declined':
          title = 'Invitation Declined';
          message = `${notification.declinedBy} declined your invitation to "${notification.roomName}"`;
          break;
        case 'room_member_kicked':
          title = 'Removed from Room';
          message = `You were removed from "${notification.roomName}"`;
          break;
        case 'room_deleted':
          title = 'Room Deleted';
          message = `The room "${notification.roomName}" has been deleted`;
          break;
        case 'subscription_upgraded':
          title = 'Welcome to Pro!';
          message = 'Your Pro subscription is now active. Enjoy unlimited features!';
          break;
        case 'subscription_canceled':
          title = 'Subscription Canceled';
          message = 'Your Pro subscription has been canceled. Access continues until period end.';
          break;
        case 'weekly_reward_won':
          title = `Weekly Reward: ${notification.rewardLabel}`;
          message = `Congratulations! You placed #${notification.rank} on the weekly leaderboard.`;
          break;
        case 'payment_receipt':
          title = 'Payment Received';
          message = `Payment of Rs. ${notification.amount} received. Thank you!`;
          break;
        case 'published_template_removed':
          title = 'Published Template Removed';
          message = `Your published skillmap "${notification.skillmapName}" has been removed from the Templates gallery. You can resubmit it for review.`;
          break;
        case 'new_publish_request':
          title = 'New Publish Request';
          message = `${notification.userName} submitted "${notification.skillmapName}" for review.`;
          break;
        default:
          title = 'Notification';
          message = 'You have a new notification';
      }

      // Store notification in database
      const newNotification = await Notification.create({
        userId,
        type: notification.type,
        title,
        message,
        data: notification,
        read: false
      });

      console.log('[IN-APP NOTIFICATION STORED]', {
        userId,
        type: notification.type,
        notificationId: newNotification._id
      });

      await ErrorLoggingService.logSystemEvent('in_app_notification_sent', {
        userId,
        type: notification.type,
        notificationId: newNotification._id.toString(),
        timestamp: new Date().toISOString()
      });

      return { 
        success: true, 
        userId, 
        type: notification.type,
        notificationId: newNotification._id 
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        notificationType: notification.type,
        operation: 'sendInAppNotification',
        timestamp: new Date().toISOString()
      });

      // Don't throw - notification failures should not break the main flow
      console.error('Failed to send in-app notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send invitation created notification
   * Requirements: 5.5-5.6, 31.1-31.6
   * @param {Object} invitation - Invitation object
   * @param {Object} room - Room object
   * @param {Object} invitedUser - Invited user object
   * @param {Object} ownerUser - Owner user object
   * @returns {Promise<Object>} Notification results
   */
  async sendInvitationCreatedNotification(invitation, room, invitedUser, ownerUser) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const dashboardLink = `${clientUrl}/dashboard`;

      // Send in-app notification
      const inAppResult = await this._sendInAppNotification(invitedUser.firebaseUid, {
        type: 'room_invitation_received',
        roomId: room._id,
        roomName: room.name,
        invitedBy: ownerUser.name,
        invitedByUserId: ownerUser.firebaseUid,
        invitationId: invitation._id,
        expiresAt: invitation.expiresAt,
        timestamp: new Date().toISOString()
      });

      // Send email notification
      const emailSubject = `${ownerUser.name} has invited you to join "${room.name}" on LearnLoop`;
      const emailText = `
Hi ${invitedUser.name},

${ownerUser.name} (${ownerUser.email}) has invited you to join their RoomSpace "${room.name}" on LearnLoop.

${room.description ? `About this room: ${room.description}\n` : ''}
Log in to your dashboard to accept or decline this invitation:
${dashboardLink}

This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString()}.

Happy learning!
The LearnLoop Team
      `.trim();

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 560px; margin: 40px auto; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background-color: #2e5023; padding: 32px 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .content { padding: 32px; }
    .invite-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .invite-card .room-name { font-size: 20px; font-weight: 700; color: #2e5023; margin: 0 0 4px; }
    .invite-card .invited-by { font-size: 14px; color: #4b5563; margin: 0; }
    .description { background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #6b7280; font-style: italic; }
    .cta-btn { display: block; width: 100%; padding: 14px 24px; background-color: #2e5023; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; margin: 24px 0 16px; box-sizing: border-box; }
    .expires { text-align: center; font-size: 13px; color: #9ca3af; margin: 16px 0 0; }
    .footer { text-align: center; padding: 24px 32px; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🎓 RoomSpace Invitation</h1>
        <p>You've been invited to a learning room</p>
      </div>
      <div class="content">
        <p>Hi <strong>${invitedUser.name}</strong>,</p>
        
        <div class="invite-card">
          <p class="room-name">${room.name}</p>
          <p class="invited-by">Invited by <strong>${ownerUser.name}</strong></p>
        </div>

        ${room.description ? `<div class="description">"${room.description}"</div>` : ''}

        <p style="font-size: 14px; color: #4b5563;">Log in to your LearnLoop dashboard to accept or decline this invitation. You'll find it in your notification bell.</p>

        <a href="${dashboardLink}" class="cta-btn">Open LearnLoop Dashboard</a>

        <p class="expires">This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="footer">
        Happy learning! · The LearnLoop Team
      </div>
    </div>
  </div>
</body>
</html>
      `.trim();

      const emailResult = await this._sendEmail(
        invitedUser.email,
        emailSubject,
        emailText,
        emailHtml
      );

      return {
        inApp: inAppResult,
        email: emailResult
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        invitationId: invitation._id,
        roomId: room._id,
        operation: 'sendInvitationCreatedNotification',
        timestamp: new Date().toISOString()
      });

      // Don't throw - notification failures should not break the main flow
      console.error('Failed to send invitation created notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send invitation accepted notification to room owner
   * Requirements: 8.7, 31.1-31.6
   * @param {Object} invitation - Invitation object
   * @param {Object} room - Room object
   * @param {Object} acceptedUser - User who accepted
   * @param {Object} ownerUser - Owner user object
   * @returns {Promise<Object>} Notification result
   */
  async sendInvitationAcceptedNotification(invitation, room, acceptedUser, ownerUser) {
    try {
      // Send in-app notification to owner
      const inAppResult = await this._sendInAppNotification(ownerUser.firebaseUid, {
        type: 'room_invitation_accepted',
        roomId: room._id,
        roomName: room.name,
        acceptedBy: acceptedUser.name,
        acceptedByUserId: acceptedUser.firebaseUid,
        invitationId: invitation._id,
        timestamp: new Date().toISOString()
      });

      return { inApp: inAppResult };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        invitationId: invitation._id,
        roomId: room._id,
        operation: 'sendInvitationAcceptedNotification',
        timestamp: new Date().toISOString()
      });

      console.error('Failed to send invitation accepted notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send invitation declined notification to room owner
   * Requirements: 9.2, 31.1-31.6
   * @param {Object} invitation - Invitation object
   * @param {Object} room - Room object
   * @param {Object} declinedUser - User who declined
   * @param {Object} ownerUser - Owner user object
   * @returns {Promise<Object>} Notification result
   */
  async sendInvitationDeclinedNotification(invitation, room, declinedUser, ownerUser) {
    try {
      // Send in-app notification to owner
      const inAppResult = await this._sendInAppNotification(ownerUser.firebaseUid, {
        type: 'room_invitation_declined',
        roomId: room._id,
        roomName: room.name,
        declinedBy: declinedUser.name,
        declinedByUserId: declinedUser.firebaseUid,
        invitationId: invitation._id,
        timestamp: new Date().toISOString()
      });

      return { inApp: inAppResult };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        invitationId: invitation._id,
        roomId: room._id,
        operation: 'sendInvitationDeclinedNotification',
        timestamp: new Date().toISOString()
      });

      console.error('Failed to send invitation declined notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send member kicked notification
   * Requirements: 10.4, 31.1-31.6
   * @param {Object} room - Room object
   * @param {Object} kickedUser - User who was kicked
   * @returns {Promise<Object>} Notification result
   */
  async sendMemberKickedNotification(room, kickedUser) {
    try {
      // Send in-app notification to kicked user
      const inAppResult = await this._sendInAppNotification(kickedUser.firebaseUid, {
        type: 'room_member_kicked',
        roomId: room._id,
        roomName: room.name,
        timestamp: new Date().toISOString()
      });

      return { inApp: inAppResult };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId: room._id,
        kickedUserId: kickedUser.firebaseUid,
        operation: 'sendMemberKickedNotification',
        timestamp: new Date().toISOString()
      });

      console.error('Failed to send member kicked notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send room deleted notification to all members
   * Requirements: 11.5, 31.1-31.6
   * @param {Object} room - Room object
   * @param {Array} members - Array of member objects with user details
   * @returns {Promise<Array>} Array of notification results
   */
  async sendRoomDeletedNotification(room, members) {
    try {
      const notificationPromises = members.map(async (member) => {
        // Don't notify the owner (they deleted it)
        if (member.userId === room.ownerId) {
          return { skipped: true, userId: member.userId, reason: 'owner' };
        }

        return await this._sendInAppNotification(member.userId, {
          type: 'room_deleted',
          roomId: room._id,
          roomName: room.name,
          timestamp: new Date().toISOString()
        });
      });

      const results = await Promise.all(notificationPromises);
      return results;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId: room._id,
        operation: 'sendRoomDeletedNotification',
        timestamp: new Date().toISOString()
      });

      console.error('Failed to send room deleted notifications:', error.message);
      return { error: error.message };
    }
  }
  // ─── Subscription Notifications ──────────────────────────

  /**
   * Send notification when user upgrades to Pro.
   */
  async sendSubscriptionUpgradeNotification(user, subscription) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const endDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

      // In-app
      await this._sendInAppNotification(user.firebaseUid || user._id?.toString(), {
        type: 'subscription_upgraded',
        tier: 'pro',
        periodEnd: subscription.currentPeriodEnd,
        timestamp: new Date().toISOString()
      });

      // Email
      const subject = 'Welcome to LearnLoop Pro!';
      const text = `Hi ${user.name},\n\nYou've been upgraded to LearnLoop Pro! Your subscription is active until ${endDate}.\n\nYou now have unlimited skill maps, rooms, nodes, and more.\n\nHappy learning!\nThe LearnLoop Team`;
      const html = `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#f3f4f6}
.c{max-width:560px;margin:40px auto}.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hd{background:#2e5023;padding:32px;text-align:center}.hd h1{color:#fff;font-size:22px;margin:0;font-weight:700}.hd p{color:rgba(255,255,255,.8);font-size:14px;margin:8px 0 0}
.ct{padding:32px}.info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;text-align:center}
.info .t{font-size:20px;font-weight:700;color:#2e5023;margin:0}.info .s{font-size:14px;color:#4b5563;margin:4px 0 0}
.btn{display:block;width:100%;padding:14px;background:#2e5023;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;text-align:center;margin:24px 0;box-sizing:border-box}
.ft{text-align:center;padding:24px;font-size:13px;color:#9ca3af}
</style></head><body><div class="c"><div class="card">
<div class="hd"><h1>Welcome to Pro!</h1><p>Your upgrade is complete</p></div>
<div class="ct">
<p>Hi <strong>${user.name}</strong>,</p>
<div class="info"><p class="t">Pro Plan Active</p><p class="s">Until ${endDate}</p></div>
<p style="font-size:14px;color:#4b5563">You now have access to:</p>
<ul style="font-size:14px;color:#4b5563;padding-left:20px">
<li>Unlimited skill maps</li><li>Up to 15 nodes per map</li><li>Unlimited rooms and members</li><li>PDF export</li><li>Unlimited sessions per node</li>
</ul>
<a href="${clientUrl}/subscription" class="btn">View Your Subscription</a>
</div><div class="ft">Happy learning! · The LearnLoop Team</div>
</div></div></body></html>`.trim();

      await this._sendEmail(user.email, subject, text, html);
      console.log(`📧 Subscription upgrade notification sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send subscription upgrade notification:', error.message);
    }
  }

  /**
   * Send notification when user cancels Pro.
   */
  async sendSubscriptionCancelNotification(user, subscription) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const endDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

      // In-app
      await this._sendInAppNotification(user.firebaseUid || user._id?.toString(), {
        type: 'subscription_canceled',
        periodEnd: subscription.currentPeriodEnd,
        timestamp: new Date().toISOString()
      });

      // Email
      const subject = 'Your LearnLoop Pro subscription has been canceled';
      const text = `Hi ${user.name},\n\nYour Pro subscription has been canceled. You'll continue to have Pro access until ${endDate}.\n\nAfter that, your account will revert to the Free plan.\n\nYou can resubscribe anytime from your subscription page.\n\nThe LearnLoop Team`;
      const html = `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#f3f4f6}
.c{max-width:560px;margin:40px auto}.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hd{background:#6b7280;padding:32px;text-align:center}.hd h1{color:#fff;font-size:22px;margin:0;font-weight:700}.hd p{color:rgba(255,255,255,.8);font-size:14px;margin:8px 0 0}
.ct{padding:32px}.info{background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:20px 0;text-align:center}
.info .t{font-size:18px;font-weight:700;color:#92400e;margin:0}.info .s{font-size:14px;color:#78350f;margin:4px 0 0}
.btn{display:block;width:100%;padding:14px;background:#2e5023;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;text-align:center;margin:24px 0;box-sizing:border-box}
.ft{text-align:center;padding:24px;font-size:13px;color:#9ca3af}
</style></head><body><div class="c"><div class="card">
<div class="hd"><h1>Subscription Canceled</h1><p>We're sorry to see you go</p></div>
<div class="ct">
<p>Hi <strong>${user.name}</strong>,</p>
<p style="font-size:14px;color:#4b5563">Your Pro subscription has been canceled.</p>
<div class="info"><p class="t">Pro access until</p><p class="s">${endDate}</p></div>
<p style="font-size:14px;color:#4b5563">After this date, your account will revert to the Free plan with limited features. Your data won't be deleted — you just won't be able to access items beyond the free limits.</p>
<p style="font-size:14px;color:#4b5563">Changed your mind? You can resubscribe anytime.</p>
<a href="${clientUrl}/subscription" class="btn">Resubscribe</a>
</div><div class="ft">The LearnLoop Team</div>
</div></div></body></html>`.trim();

      await this._sendEmail(user.email, subject, text, html);
      console.log(`📧 Subscription cancel notification sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send subscription cancel notification:', error.message);
    }
  }

  /**
   * Send a nudge email to an inactive user encouraging them to return
   * @param {Object} user - User object with name, email
   * @param {Object} stats - User stats (lastLoginAt, practiceCount, skillCount)
   * @returns {Promise<Object>} Email send result
   */
  async sendNudgeEmail(user, stats = {}) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173'
      const dashboardLink = `${clientUrl}/dashboard`
      const daysInactive = stats.daysInactive || 0

      const emailSubject = `We miss you on LearnLoop, ${user.name}!`
      const emailText = `
Hi ${user.name},

It's been ${daysInactive} days since your last visit to LearnLoop. Your learning journey is waiting for you!

${stats.practiceCount > 0 ? `You've already logged ${stats.practiceCount} practice sessions — don't let that momentum fade.` : 'Start your first practice session and build some momentum.'}

Jump back in: ${dashboardLink}

Happy learning!
The LearnLoop Team
      `.trim()

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 560px; margin: 40px auto; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background-color: #2e5023; padding: 32px 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .content { padding: 32px; }
    .stat-row { display: flex; justify-content: center; gap: 24px; margin: 20px 0; }
    .stat { text-align: center; background: #f0fdf4; border-radius: 12px; padding: 16px 24px; }
    .stat .num { font-size: 24px; font-weight: 700; color: #2e5023; }
    .stat .lbl { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .cta-btn { display: block; width: 100%; padding: 14px 24px; background-color: #2e5023; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; margin: 24px 0 16px; box-sizing: border-box; }
    .footer { text-align: center; padding: 24px 32px; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>👋 We miss you, ${user.name}!</h1>
        <p>Your learning journey is waiting</p>
      </div>
      <div class="content">
        <p>It's been <strong>${daysInactive} days</strong> since your last visit. Pick up where you left off!</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
          <tr>
            <td align="center" style="padding: 8px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px 24px; display: inline-block;">
                <div style="font-size: 24px; font-weight: 700; color: #2e5023;">${stats.practiceCount || 0}</div>
                <div style="font-size: 12px; color: #6b7280;">Sessions</div>
              </div>
            </td>
            <td align="center" style="padding: 8px;">
              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px 24px; display: inline-block;">
                <div style="font-size: 24px; font-weight: 700; color: #2e5023;">${stats.skillCount || 0}</div>
                <div style="font-size: 12px; color: #6b7280;">Skill Maps</div>
              </div>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #4b5563;">Even a quick 5-minute session keeps your streak alive and your skills sharp.</p>

        <a href="${dashboardLink}" class="cta-btn">Continue Learning</a>
      </div>
      <div class="footer">
        Happy learning! · The LearnLoop Team
      </div>
    </div>
  </div>
</body>
</html>
      `.trim()

      const result = await this._sendEmail(user.email, emailSubject, emailText, emailHtml)
      return result
    } catch (error) {
      console.error('Failed to send nudge email:', error.message)
      return { error: error.message }
    }
  }
  /**
   * Send a celebratory "You won!" email to weekly reward winners.
   */
  async sendWeeklyRewardWinnerNotification(user, reward) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const endDate = reward.subscriptionExtendedTo
        ? new Date(reward.subscriptionExtendedTo).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';
      const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const medal = medals[reward.rank] || '🏆';
      const ordinal = { 1: '1st', 2: '2nd', 3: '3rd' }[reward.rank] || `#${reward.rank}`;

      // In-app notification
      await this._sendInAppNotification(user.firebaseUid || user._id?.toString(), {
        type: 'weekly_reward_won',
        rank: reward.rank,
        rewardLabel: reward.rewardLabel,
        weeklyXp: reward.weeklyXp,
        subscriptionExtendedTo: reward.subscriptionExtendedTo,
        timestamp: new Date().toISOString()
      });

      const subject = `${medal} Congratulations! You won ${reward.rewardLabel} of free Pro!`;
      const text = `Hi ${user.name},\n\nAmazing news! You placed ${ordinal} on this week's XP leaderboard with ${reward.weeklyXp.toLocaleString()} XP!\n\nYour reward: ${reward.rewardLabel} of free Pro subscription.\nPro access until: ${endDate}\n\nKeep up the incredible work!\nThe LearnLoop Team`;
      const html = `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#f3f4f6}
.c{max-width:560px;margin:40px auto}.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hd{background:linear-gradient(135deg,#d97706,#f59e0b);padding:36px 32px;text-align:center}
.hd .medal{font-size:48px;margin-bottom:8px}.hd h1{color:#fff;font-size:24px;margin:0;font-weight:800}.hd p{color:rgba(255,255,255,.9);font-size:15px;margin:8px 0 0}
.ct{padding:32px}
.reward-box{background:linear-gradient(135deg,#fef3c7,#fffbeb);border:2px solid #fbbf24;border-radius:14px;padding:24px;margin:20px 0;text-align:center}
.reward-box .rank{font-size:14px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px}
.reward-box .prize{font-size:22px;font-weight:800;color:#78350f;margin:0}
.reward-box .xp{font-size:14px;color:#a16207;margin:8px 0 0}
.info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;text-align:center}
.info .t{font-size:16px;font-weight:700;color:#2e5023;margin:0}.info .s{font-size:13px;color:#4b5563;margin:4px 0 0}
.btn{display:block;width:100%;padding:14px;background:#2e5023;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;text-align:center;margin:24px 0;box-sizing:border-box}
.ft{text-align:center;padding:24px;font-size:13px;color:#9ca3af}
</style></head><body><div class="c"><div class="card">
<div class="hd"><div class="medal">${medal}</div><h1>You're a Winner!</h1><p>Weekly XP Leaderboard Reward</p></div>
<div class="ct">
<p>Hi <strong>${user.name}</strong>,</p>
<p style="font-size:14px;color:#4b5563">Amazing news! You placed <strong>${ordinal}</strong> on this week's XP leaderboard!</p>
<div class="reward-box">
<p class="rank">${ordinal} Place</p>
<p class="prize">${reward.rewardLabel} Free Pro</p>
<p class="xp">${reward.weeklyXp.toLocaleString()} XP earned this week</p>
</div>
<div class="info"><p class="t">Pro active until</p><p class="s">${endDate}</p></div>
<p style="font-size:14px;color:#4b5563">Your Pro subscription has been automatically extended. Keep practicing to win again next week!</p>
<a href="${clientUrl}/subscription" class="btn">View Your Subscription</a>
</div><div class="ft">Keep learning, keep winning! · The LearnLoop Team</div>
</div></div></body></html>`.trim();

      await this._sendEmail(user.email, subject, text, html);
      console.log(`🏆📧 Weekly reward winner notification sent to ${user.email} (rank #${reward.rank})`);
    } catch (error) {
      console.error('Failed to send weekly reward winner notification:', error.message);
    }
  }

  /**
   * Send a payment receipt email after successful eSewa payment.
   */
  async sendPaymentReceiptNotification(user, payment, subscription) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const paidDate = new Date(payment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const endDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';
      const planLabel = {
        pro_1month: 'Pro — 1 Month',
        pro_3month: 'Pro — 3 Months',
        pro_6month: 'Pro — 6 Months',
      }[payment.plan] || payment.plan;

      // In-app notification
      await this._sendInAppNotification(user.firebaseUid || user._id?.toString(), {
        type: 'payment_receipt',
        amount: payment.totalAmount,
        plan: payment.plan,
        transactionUuid: payment.transactionUuid,
        timestamp: new Date().toISOString()
      });

      const subject = `Payment Receipt — LearnLoop Pro (Rs. ${payment.totalAmount})`;
      const text = `Hi ${user.name},\n\nThank you for your payment!\n\nReceipt\n-------\nPlan: ${planLabel}\nAmount: Rs. ${payment.totalAmount}\nTransaction ID: ${payment.transactionUuid}\nDate: ${paidDate}\nPro active until: ${endDate}\n\nThank you for supporting LearnLoop!\nThe LearnLoop Team`;
      const html = `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#f3f4f6}
.c{max-width:560px;margin:40px auto}.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hd{background:#2e5023;padding:32px;text-align:center}.hd h1{color:#fff;font-size:22px;margin:0;font-weight:700}.hd p{color:rgba(255,255,255,.8);font-size:14px;margin:8px 0 0}
.ct{padding:32px}
.receipt{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:20px 0}
.receipt .row{display:flex;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px}
.receipt .row:last-child{border-bottom:none}
.receipt .row .lbl{color:#6b7280}.receipt .row .val{font-weight:600;color:#1a1a1a}
.receipt .total{background:#f0fdf4;font-size:15px}.receipt .total .val{color:#2e5023;font-weight:700}
.btn{display:block;width:100%;padding:14px;background:#2e5023;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;text-align:center;margin:24px 0;box-sizing:border-box}
.ft{text-align:center;padding:24px;font-size:13px;color:#9ca3af}
</style></head><body><div class="c"><div class="card">
<div class="hd"><h1>Payment Receipt</h1><p>Thank you for your purchase</p></div>
<div class="ct">
<p>Hi <strong>${user.name}</strong>,</p>
<p style="font-size:14px;color:#4b5563">Here's your receipt for your LearnLoop Pro subscription.</p>
<div class="receipt">
<div class="row"><span class="lbl">Plan</span><span class="val">${planLabel}</span></div>
<div class="row"><span class="lbl">Date</span><span class="val">${paidDate}</span></div>
<div class="row"><span class="lbl">Transaction ID</span><span class="val" style="font-size:12px;font-family:monospace">${payment.transactionUuid}</span></div>
<div class="row"><span class="lbl">Payment Method</span><span class="val">eSewa</span></div>
<div class="row"><span class="lbl">Pro Active Until</span><span class="val">${endDate}</span></div>
<div class="row total"><span class="lbl">Total Paid</span><span class="val">Rs. ${payment.totalAmount}</span></div>
</div>
<a href="${clientUrl}/subscription" class="btn">View Subscription</a>
</div><div class="ft">Thank you for supporting LearnLoop! · The LearnLoop Team</div>
</div></div></body></html>`.trim();

      await this._sendEmail(user.email, subject, text, html);
      console.log(`🧾📧 Payment receipt sent to ${user.email} (Rs. ${payment.totalAmount})`);
    } catch (error) {
      console.error('Failed to send payment receipt notification:', error.message);
    }
  }

  /**
   * Send notification when publish request is approved
   * @param {string} userId - User ID
   * @param {string} skillmapName - Skillmap name
   * @param {string} templateId - Created template ID
   * @returns {Promise<Object>} Notification results
   */
  async sendPublishRequestApprovedNotification(userId, skillmapName, templateId) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const templatesLink = `${clientUrl}/templates`;

      // Get user email
      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({ firebaseUid: userId }).select('name email').lean();
      if (!user) {
        console.warn('User not found for publish approval notification:', userId);
        return { error: 'User not found' };
      }

      // In-app notification
      const inAppResult = await this._sendInAppNotification(userId, {
        type: 'publish_request_approved',
        skillmapName,
        templateId,
        timestamp: new Date().toISOString()
      });

      // Email notification
      const emailSubject = `🎉 Your skillmap "${skillmapName}" has been published!`;
      const emailText = `
Hi ${user.name},

Great news! Your skillmap "${skillmapName}" has been approved and is now live in the Templates section.

Other LearnLoop users can now discover and use your skillmap to guide their learning journey.

View it in the templates gallery: ${templatesLink}

Thank you for contributing to the LearnLoop community!
The LearnLoop Team
      `.trim();

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 560px; margin: 40px auto; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2e5023, #4f7942); padding: 36px 32px; text-align: center; }
    .header .icon { font-size: 48px; margin-bottom: 8px; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.9); font-size: 15px; margin: 8px 0 0; }
    .content { padding: 32px; }
    .skillmap-card { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 14px; padding: 24px; margin: 20px 0; text-align: center; }
    .skillmap-card .name { font-size: 22px; font-weight: 800; color: #2e5023; margin: 0; }
    .skillmap-card .status { font-size: 14px; color: #15803d; margin: 8px 0 0; font-weight: 600; }
    .cta-btn { display: block; width: 100%; padding: 14px 24px; background-color: #2e5023; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; margin: 24px 0 16px; box-sizing: border-box; }
    .footer { text-align: center; padding: 24px 32px; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="icon">🎉</div>
        <h1>Your Skillmap is Published!</h1>
        <p>Congratulations on your contribution</p>
      </div>
      <div class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        
        <div class="skillmap-card">
          <p class="name">${skillmapName}</p>
          <p class="status">✓ Now Live in Templates</p>
        </div>

        <p style="font-size: 14px; color: #4b5563;">Your skillmap has been approved and is now available in the Templates section. Other LearnLoop users can discover and use it to guide their learning journey.</p>

        <p style="font-size: 14px; color: #4b5563;">Thank you for contributing to the LearnLoop community!</p>

        <a href="${templatesLink}" class="cta-btn">View in Templates Gallery</a>
      </div>
      <div class="footer">
        Keep creating! · The LearnLoop Team
      </div>
    </div>
  </div>
</body>
</html>
      `.trim();

      const emailResult = await this._sendEmail(
        user.email,
        emailSubject,
        emailText,
        emailHtml
      );

      return {
        inApp: inAppResult,
        email: emailResult
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        skillmapName,
        operation: 'sendPublishRequestApprovedNotification',
        timestamp: new Date().toISOString()
      });

      console.error('Failed to send publish request approved notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send notification when publish request is rejected
   * @param {string} userId - User ID
   * @param {string} skillmapName - Skillmap name
   * @param {string} adminNote - Rejection reason
   * @returns {Promise<Object>} Notification results
   */
  async sendPublishRequestRejectedNotification(userId, skillmapName, adminNote) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const dashboardLink = `${clientUrl}/dashboard`;

      // Get user email
      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({ firebaseUid: userId }).select('name email').lean();
      if (!user) {
        console.warn('User not found for publish rejection notification:', userId);
        return { error: 'User not found' };
      }

      // In-app notification
      const inAppResult = await this._sendInAppNotification(userId, {
        type: 'publish_request_rejected',
        skillmapName,
        adminNote,
        timestamp: new Date().toISOString()
      });

      // Email notification
      const emailSubject = `Update on your skillmap "${skillmapName}"`;
      const emailText = `
Hi ${user.name},

Thank you for submitting your skillmap "${skillmapName}" for publication.

After review, we're unable to approve it at this time.

${adminNote ? `Reason: ${adminNote}\n` : ''}
You may revise your skillmap and resubmit it. We encourage you to:
- Ensure all nodes have clear, descriptive titles
- Add helpful descriptions to guide learners
- Check that the learning path flows logically

You can resubmit once per quota cycle (3 submissions per 30 days).

View your skillmap: ${dashboardLink}

Thank you for contributing to LearnLoop!
The LearnLoop Team
      `.trim();

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 560px; margin: 40px auto; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #6b7280; padding: 32px 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .content { padding: 32px; }
    .skillmap-card { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .skillmap-card .name { font-size: 18px; font-weight: 700; color: #92400e; margin: 0 0 8px; }
    .skillmap-card .status { font-size: 14px; color: #78350f; margin: 0; }
    .reason-box { background: #f9fafb; border-left: 4px solid #d97706; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .reason-box .label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin: 0 0 4px; }
    .reason-box .text { font-size: 14px; color: #1a1a1a; margin: 0; }
    .tips { background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .tips .title { font-size: 14px; font-weight: 700; color: #2e5023; margin: 0 0 8px; }
    .tips ul { margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; }
    .cta-btn { display: block; width: 100%; padding: 14px 24px; background-color: #2e5023; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; margin: 24px 0 16px; box-sizing: border-box; }
    .footer { text-align: center; padding: 24px 32px; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Skillmap Review Update</h1>
        <p>Thank you for your submission</p>
      </div>
      <div class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        
        <div class="skillmap-card">
          <p class="name">${skillmapName}</p>
          <p class="status">Not approved at this time</p>
        </div>

        ${adminNote ? `
        <div class="reason-box">
          <p class="label">Feedback</p>
          <p class="text">${adminNote}</p>
        </div>
        ` : ''}

        <div class="tips">
          <p class="title">Tips for resubmission:</p>
          <ul>
            <li>Ensure all nodes have clear, descriptive titles</li>
            <li>Add helpful descriptions to guide learners</li>
            <li>Check that the learning path flows logically</li>
            <li>Include at least 5 well-structured nodes</li>
          </ul>
        </div>

        <p style="font-size: 14px; color: #4b5563;">You can revise and resubmit your skillmap. Remember, you have 3 submission attempts per 30-day period.</p>

        <a href="${dashboardLink}" class="cta-btn">View Your Skillmap</a>
      </div>
      <div class="footer">
        Keep creating! · The LearnLoop Team
      </div>
    </div>
  </div>
</body>
</html>
      `.trim();

      const emailResult = await this._sendEmail(
        user.email,
        emailSubject,
        emailText,
        emailHtml
      );

      return {
        inApp: inAppResult,
        email: emailResult
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        userId,
        skillmapName,
        operation: 'sendPublishRequestRejectedNotification',
        timestamp: new Date().toISOString()
      });

      console.error('Failed to send publish request rejected notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send notification when admin removes a published template
   * @param {string} userId - User ID (firebaseUid)
   * @param {string} skillmapName - Skillmap name
   * @returns {Promise<Object>} Notification results
   */
  async sendPublishedTemplateRemovedNotification(userId, skillmapName) {
    try {
      const clientUrl = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      const dashboardLink = `${clientUrl}/dashboard`;

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({ firebaseUid: userId }).select('name email').lean();
      if (!user) {
        console.warn('User not found for template removal notification:', userId);
        return { error: 'User not found' };
      }

      // In-app notification
      const inAppResult = await this._sendInAppNotification(userId, {
        type: 'published_template_removed',
        skillmapName,
        timestamp: new Date().toISOString()
      });

      // Email notification
      const emailSubject = `Your published skillmap "${skillmapName}" has been removed`;
      const emailText = `
Hi ${user.name},

Your skillmap "${skillmapName}" has been removed from the Templates gallery by an administrator.

You can revise your skillmap and resubmit it for review from your dashboard.

View your skillmap: ${dashboardLink}

The LearnLoop Team
      `.trim();

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 560px; margin: 40px auto; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #6b7280; padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .content { padding: 32px; }
    .skillmap-card { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .skillmap-card .name { font-size: 18px; font-weight: 700; color: #92400e; margin: 0 0 4px; }
    .skillmap-card .status { font-size: 14px; color: #78350f; margin: 0; }
    .cta-btn { display: block; width: 100%; padding: 14px 24px; background-color: #2e5023; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; margin: 24px 0 16px; box-sizing: border-box; }
    .footer { text-align: center; padding: 24px 32px; font-size: 13px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Template Removed</h1>
        <p>An update about your published skillmap</p>
      </div>
      <div class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        <div class="skillmap-card">
          <p class="name">${skillmapName}</p>
          <p class="status">Removed from Templates</p>
        </div>
        <p style="font-size: 14px; color: #4b5563;">Your skillmap has been removed from the Templates gallery by an administrator. You can revise it and resubmit for review.</p>
        <a href="${dashboardLink}" class="cta-btn">Go to Dashboard</a>
      </div>
      <div class="footer">The LearnLoop Team</div>
    </div>
  </div>
</body>
</html>
      `.trim();

      const emailResult = await this._sendEmail(user.email, emailSubject, emailText, emailHtml);

      return { inApp: inAppResult, email: emailResult };
    } catch (error) {
      console.error('Failed to send template removed notification:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Send notification to all admins when a user submits a publish request
   * @param {string} userName - Name of the user who submitted
   * @param {string} skillmapName - Skillmap name
   * @param {string} requestId - Publish request ID
   * @returns {Promise<Object>} Notification results
   */
  async sendNewPublishRequestNotification(userName, skillmapName, requestId) {
    try {
      const User = (await import('../models/User.js')).default;
      const admins = await User.find({ role: 'admin' }).select('firebaseUid name email').lean();

      if (admins.length === 0) {
        console.warn('No admins found to notify about new publish request');
        return { error: 'No admins found' };
      }

      const results = await Promise.all(
        admins.map(admin =>
          this._sendInAppNotification(admin.firebaseUid, {
            type: 'new_publish_request',
            userName,
            skillmapName,
            requestId,
            timestamp: new Date().toISOString()
          })
        )
      );

      console.log(`📬 Notified ${admins.length} admin(s) about new publish request from ${userName}`);
      return { success: true, notifiedAdmins: admins.length, results };
    } catch (error) {
      console.error('Failed to send new publish request notification to admins:', error.message);
      return { error: error.message };
    }
  }
}

export default new NotificationService();
