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
   * Send in-app notification (placeholder for future implementation)
   * In a real system, this would store notifications in a database
   * and use WebSocket to push to connected clients
   * @param {string} userId - User ID to notify
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Notification result
   * @private
   */
  async _sendInAppNotification(userId, notification) {
    try {
      // TODO: Implement in-app notification storage and WebSocket push
      // For now, just log the notification
      console.log('[IN-APP NOTIFICATION]', {
        userId,
        ...notification
      });

      await ErrorLoggingService.logSystemEvent('in_app_notification_sent', {
        userId,
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      return { success: true, userId, type: notification.type };
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
}

export default new NotificationService();
