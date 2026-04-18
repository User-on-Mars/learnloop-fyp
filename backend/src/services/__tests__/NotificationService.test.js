import NotificationService from '../NotificationService.js';
import ErrorLoggingService from '../ErrorLoggingService.js';

// Mock ErrorLoggingService
jest.mock('../ErrorLoggingService.js', () => ({
  logSystemEvent: jest.fn(),
  logError: jest.fn()
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('sendInvitationCreatedNotification', () => {
    it('should send invitation created notification with email and in-app', async () => {
      const invitation = {
        _id: 'inv123',
        roomId: 'room123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const room = {
        _id: 'room123',
        name: 'Test Room',
        description: 'A test room'
      };

      const invitedUser = {
        firebaseUid: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const ownerUser = {
        firebaseUid: 'owner123',
        name: 'Jane Smith'
      };

      const result = await NotificationService.sendInvitationCreatedNotification(
        invitation,
        room,
        invitedUser,
        ownerUser
      );

      expect(result).toHaveProperty('inApp');
      expect(result).toHaveProperty('email');
      expect(result.inApp.success).toBe(true);
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'in_app_notification_sent',
        expect.objectContaining({
          userId: 'user123',
          type: 'room_invitation_received'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const invitation = {
        _id: 'inv123',
        roomId: 'room123',
        expiresAt: new Date()
      };

      const room = {
        _id: 'room123',
        name: 'Test Room'
      };

      const invitedUser = null; // This will cause an error
      const ownerUser = {
        firebaseUid: 'owner123',
        name: 'Jane Smith'
      };

      const result = await NotificationService.sendInvitationCreatedNotification(
        invitation,
        room,
        invitedUser,
        ownerUser
      );

      expect(result).toHaveProperty('error');
      expect(ErrorLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('sendInvitationAcceptedNotification', () => {
    it('should send invitation accepted notification to owner', async () => {
      const invitation = {
        _id: 'inv123',
        roomId: 'room123'
      };

      const room = {
        _id: 'room123',
        name: 'Test Room'
      };

      const acceptedUser = {
        firebaseUid: 'user123',
        name: 'John Doe'
      };

      const ownerUser = {
        firebaseUid: 'owner123',
        name: 'Jane Smith'
      };

      const result = await NotificationService.sendInvitationAcceptedNotification(
        invitation,
        room,
        acceptedUser,
        ownerUser
      );

      expect(result).toHaveProperty('inApp');
      expect(result.inApp.success).toBe(true);
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'in_app_notification_sent',
        expect.objectContaining({
          userId: 'owner123',
          type: 'room_invitation_accepted'
        })
      );
    });
  });

  describe('sendInvitationDeclinedNotification', () => {
    it('should send invitation declined notification to owner', async () => {
      const invitation = {
        _id: 'inv123',
        roomId: 'room123'
      };

      const room = {
        _id: 'room123',
        name: 'Test Room'
      };

      const declinedUser = {
        firebaseUid: 'user123',
        name: 'John Doe'
      };

      const ownerUser = {
        firebaseUid: 'owner123',
        name: 'Jane Smith'
      };

      const result = await NotificationService.sendInvitationDeclinedNotification(
        invitation,
        room,
        declinedUser,
        ownerUser
      );

      expect(result).toHaveProperty('inApp');
      expect(result.inApp.success).toBe(true);
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'in_app_notification_sent',
        expect.objectContaining({
          userId: 'owner123',
          type: 'room_invitation_declined'
        })
      );
    });
  });

  describe('sendMemberKickedNotification', () => {
    it('should send member kicked notification', async () => {
      const room = {
        _id: 'room123',
        name: 'Test Room'
      };

      const kickedUser = {
        firebaseUid: 'user123',
        name: 'John Doe'
      };

      const result = await NotificationService.sendMemberKickedNotification(
        room,
        kickedUser
      );

      expect(result).toHaveProperty('inApp');
      expect(result.inApp.success).toBe(true);
      expect(ErrorLoggingService.logSystemEvent).toHaveBeenCalledWith(
        'in_app_notification_sent',
        expect.objectContaining({
          userId: 'user123',
          type: 'room_member_kicked'
        })
      );
    });
  });

  describe('sendRoomDeletedNotification', () => {
    it('should send room deleted notification to all members except owner', async () => {
      const room = {
        _id: 'room123',
        name: 'Test Room',
        ownerId: 'owner123'
      };

      const members = [
        { userId: 'owner123', role: 'owner' },
        { userId: 'user1', role: 'member' },
        { userId: 'user2', role: 'member' }
      ];

      const results = await NotificationService.sendRoomDeletedNotification(
        room,
        members
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('skipped', true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should handle empty member list', async () => {
      const room = {
        _id: 'room123',
        name: 'Test Room',
        ownerId: 'owner123'
      };

      const members = [];

      const results = await NotificationService.sendRoomDeletedNotification(
        room,
        members
      );

      expect(results).toHaveLength(0);
    });
  });
});
