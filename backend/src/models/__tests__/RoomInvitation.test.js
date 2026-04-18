import mongoose from 'mongoose';
import RoomInvitation from '../RoomInvitation.js';

describe('RoomInvitation Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await RoomInvitation.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid RoomInvitation with required fields', async () => {
      const invitationData = {
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const invitation = new RoomInvitation(invitationData);
      const savedInvitation = await invitation.save();

      expect(savedInvitation._id).toBeDefined();
      expect(savedInvitation.roomId).toEqual(invitationData.roomId);
      expect(savedInvitation.invitedBy).toBe('user123');
      expect(savedInvitation.invitedEmail).toBe('test@example.com');
      expect(savedInvitation.invitedUserId).toBeNull(); // default value
      expect(savedInvitation.status).toBe('pending'); // default value
      expect(savedInvitation.expiresAt).toBeDefined();
      expect(savedInvitation.createdAt).toBeDefined();
      expect(savedInvitation.updatedAt).toBeDefined();
    });

    test('should create a RoomInvitation with optional invitedUserId', async () => {
      const invitationData = {
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        invitedUserId: 'user456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const invitation = new RoomInvitation(invitationData);
      const savedInvitation = await invitation.save();

      expect(savedInvitation.invitedUserId).toBe('user456');
    });

    test('should fail validation without required roomId', async () => {
      const invitation = new RoomInvitation({
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await expect(invitation.save()).rejects.toThrow();
    });

    test('should fail validation without required invitedBy', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await expect(invitation.save()).rejects.toThrow();
    });

    test('should fail validation without required invitedEmail', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await expect(invitation.save()).rejects.toThrow();
    });

    test('should fail validation without required expiresAt', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com'
      });

      await expect(invitation.save()).rejects.toThrow();
    });
  });

  describe('Field Validation', () => {
    test('should convert invitedEmail to lowercase', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'TEST@EXAMPLE.COM',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();
      expect(savedInvitation.invitedEmail).toBe('test@example.com');
    });

    test('should trim whitespace from invitedEmail', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: '  test@example.com  ',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();
      expect(savedInvitation.invitedEmail).toBe('test@example.com');
    });

    test('should enforce status enum values', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        status: 'invalid_status',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await expect(invitation.save()).rejects.toThrow();
    });

    test('should accept valid status values', async () => {
      const validStatuses = ['pending', 'accepted', 'declined', 'expired'];
      
      for (const status of validStatuses) {
        const invitation = new RoomInvitation({
          roomId: new mongoose.Types.ObjectId(),
          invitedBy: 'user123',
          invitedEmail: `test${status}@example.com`,
          status: status,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        const savedInvitation = await invitation.save();
        expect(savedInvitation.status).toBe(status);
      }
    });
  });

  describe('Status Transitions', () => {
    test('should update status from pending to accepted', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();
      expect(savedInvitation.status).toBe('pending');

      savedInvitation.status = 'accepted';
      const updatedInvitation = await savedInvitation.save();

      expect(updatedInvitation.status).toBe('accepted');
    });

    test('should update status from pending to declined', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();
      savedInvitation.status = 'declined';
      const updatedInvitation = await savedInvitation.save();

      expect(updatedInvitation.status).toBe('declined');
    });

    test('should update status from pending to expired', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();
      savedInvitation.status = 'expired';
      const updatedInvitation = await savedInvitation.save();

      expect(updatedInvitation.status).toBe('expired');
    });
  });

  describe('Indexes', () => {
    test('should have roomId indexed', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const roomIdIndex = indexes.find(idx => idx[0].roomId && Object.keys(idx[0]).length === 1);
      
      expect(roomIdIndex).toBeDefined();
    });

    test('should have invitedUserId indexed', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const invitedUserIdIndex = indexes.find(idx => idx[0].invitedUserId && Object.keys(idx[0]).length === 1);
      
      expect(invitedUserIdIndex).toBeDefined();
    });

    test('should have status indexed', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const statusIndex = indexes.find(idx => idx[0].status && Object.keys(idx[0]).length === 1);
      
      expect(statusIndex).toBeDefined();
    });

    test('should have expiresAt indexed', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const expiresAtIndex = indexes.find(idx => idx[0].expiresAt && Object.keys(idx[0]).length === 1);
      
      expect(expiresAtIndex).toBeDefined();
    });

    test('should have compound index on roomId, invitedEmail, and status', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].roomId && idx[0].invitedEmail && idx[0].status && Object.keys(idx[0]).length === 3
      );
      
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex[0].roomId).toBe(1);
      expect(compoundIndex[0].invitedEmail).toBe(1);
      expect(compoundIndex[0].status).toBe(1);
    });

    test('should have compound index on invitedUserId and status', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].invitedUserId && idx[0].status && Object.keys(idx[0]).length === 2
      );
      
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex[0].invitedUserId).toBe(1);
      expect(compoundIndex[0].status).toBe(1);
    });

    test('should have compound index on status and expiresAt for expiry job', async () => {
      const indexes = RoomInvitation.schema.indexes();
      const compoundIndex = indexes.find(idx => 
        idx[0].status && idx[0].expiresAt && Object.keys(idx[0]).length === 2
      );
      
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex[0].status).toBe(1);
      expect(compoundIndex[0].expiresAt).toBe(1);
    });
  });

  describe('Timestamps', () => {
    test('should automatically set createdAt and updatedAt', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();

      expect(savedInvitation.createdAt).toBeDefined();
      expect(savedInvitation.updatedAt).toBeDefined();
      expect(savedInvitation.createdAt).toBeInstanceOf(Date);
      expect(savedInvitation.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async () => {
      const invitation = new RoomInvitation({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedInvitation = await invitation.save();
      const originalUpdatedAt = savedInvitation.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedInvitation.status = 'accepted';
      const updatedInvitation = await savedInvitation.save();

      expect(updatedInvitation.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Expiry Functionality', () => {
    test('should query pending invitations that have expired', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

      // Create expired invitation
      await RoomInvitation.create({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'expired@example.com',
        status: 'pending',
        expiresAt: pastDate
      });

      // Create valid invitation
      await RoomInvitation.create({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'valid@example.com',
        status: 'pending',
        expiresAt: futureDate
      });

      const expiredInvitations = await RoomInvitation.find({
        status: 'pending',
        expiresAt: { $lt: now }
      });

      expect(expiredInvitations).toHaveLength(1);
      expect(expiredInvitations[0].invitedEmail).toBe('expired@example.com');
    });

    test('should query invitations by room and email', async () => {
      const roomId = new mongoose.Types.ObjectId();

      await RoomInvitation.create({
        roomId: roomId,
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await RoomInvitation.create({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const invitations = await RoomInvitation.find({
        roomId: roomId,
        invitedEmail: 'test@example.com'
      });

      expect(invitations).toHaveLength(1);
      expect(invitations[0].roomId).toEqual(roomId);
    });

    test('should query invitations by userId and status', async () => {
      await RoomInvitation.create({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test@example.com',
        invitedUserId: 'user456',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await RoomInvitation.create({
        roomId: new mongoose.Types.ObjectId(),
        invitedBy: 'user123',
        invitedEmail: 'test2@example.com',
        invitedUserId: 'user456',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const pendingInvitations = await RoomInvitation.find({
        invitedUserId: 'user456',
        status: 'pending'
      });

      expect(pendingInvitations).toHaveLength(1);
      expect(pendingInvitations[0].status).toBe('pending');
    });
  });
});
