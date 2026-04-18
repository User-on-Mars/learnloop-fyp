import RoomXpLedger from '../models/RoomXpLedger.js';
import RoomStreak from '../models/RoomStreak.js';
import RoomMember from '../models/RoomMember.js';
import User from '../models/User.js';
import ErrorLoggingService from './ErrorLoggingService.js';
import WebSocketService from './WebSocketService.js';
import { ValidationError, NotFoundError, DatabaseError } from '../utils/errors.js';

/**
 * RoomXpService - Manages room-specific XP tracking, leaderboards, and streaks.
 * Room XP is completely separate from global XP system.
 * 
 * Requirements: 19.1-19.5, 20.1-20.5, 21.1-21.7, 23.1-23.7, 24.1-24.7
 */
class RoomXpService {
  /**
   * Get the UTC calendar day (midnight) for a given date.
   * @param {Date} date
   * @returns {Date}
   */
  static _toUTCDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  /**
   * Calculate the difference in calendar days between two UTC dates.
   * @param {Date} a
   * @param {Date} b
   * @returns {number} - Number of days (a - b)
   */
  static _dayDiff(a, b) {
    const dayA = RoomXpService._toUTCDay(a);
    const dayB = RoomXpService._toUTCDay(b);
    return Math.round((dayA - dayB) / (1000 * 60 * 60 * 24));
  }

  /**
   * Award XP to a user in a room and record transaction in room_xp_ledger.
   * Requirements: 19.1-19.5, 20.1-20.5
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} skillMapId - Skill map ID
   * @param {number} xpAmount - XP amount to award (must be positive)
   * @returns {Promise<Object>} Created RoomXpLedger entry
   */
  async awardXp(roomId, userId, skillMapId, xpAmount) {
    // Validate inputs
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    if (!skillMapId) {
      throw new ValidationError('skillMapId', skillMapId, { type: 'required' });
    }

    if (typeof xpAmount !== 'number' || xpAmount < 0) {
      throw new ValidationError('xpAmount', xpAmount, { type: 'positive', message: 'XP amount must be a positive number' });
    }

    // Skip if xpAmount is 0
    if (xpAmount === 0) {
      return null;
    }

    try {
      // Requirement 20.2: Record XP transaction in room_xp_ledger
      const ledgerEntry = await RoomXpLedger.create({
        roomId,
        userId,
        skillMapId,
        xpAmount,
        earnedAt: new Date()
      });

      // Get user's new total XP in this room
      const newTotal = await this.getUserRoomXp(roomId, userId);

      // Broadcast room XP earned event
      WebSocketService.broadcastRoomXpEarned(roomId, userId, {
        xpAmount,
        newTotal,
        skillMapId
      });

      // Get updated leaderboard and broadcast
      const leaderboard = await this.getRoomLeaderboard(roomId, userId);
      WebSocketService.broadcastRoomLeaderboardUpdate(roomId, leaderboard);

      await ErrorLoggingService.logSystemEvent('room_xp_awarded', {
        roomId,
        userId,
        skillMapId,
        xpAmount,
        newTotal,
        timestamp: new Date().toISOString()
      });

      return ledgerEntry.toObject();
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        skillMapId,
        xpAmount,
        operation: 'awardXp',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('id', error.value, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('awardXp', error, { roomId, userId, skillMapId, xpAmount });
      }

      throw error;
    }
  }

  /**
   * Get room leaderboard with sorting: XP desc → streak desc → username asc.
   * Requirements: 21.1-21.7
   * 
   * @param {string} roomId - Room ID
   * @param {string} currentUserId - Current user ID (for highlighting)
   * @returns {Promise<Array>} Leaderboard entries with rank, avatar, username, XP, streak, isCurrentUser
   */
  async getRoomLeaderboard(roomId, currentUserId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    try {
      // Get all room members
      const members = await RoomMember.find({ roomId }).lean();

      if (members.length === 0) {
        return [];
      }

      const userIds = members.map(m => m.userId);

      // Requirement 21.1-21.2: Calculate room XP totals by summing room_xp_ledger entries
      const xpTotals = await RoomXpLedger.aggregate([
        { $match: { roomId: roomId, userId: { $in: userIds } } },
        { $group: { _id: '$userId', totalXp: { $sum: '$xpAmount' } } }
      ]);

      const xpMap = xpTotals.reduce((acc, item) => {
        acc[item._id] = item.totalXp;
        return acc;
      }, {});

      // Get streak data for all members
      const streaks = await RoomStreak.find({
        roomId,
        userId: { $in: userIds }
      }).lean();

      const streakMap = streaks.reduce((acc, streak) => {
        acc[streak.userId] = streak.currentStreak || 0;
        return acc;
      }, {});

      // Get user details
      const users = await User.find({
        firebaseUid: { $in: userIds }
      }).select('firebaseUid name email').lean();

      const userMap = users.reduce((acc, user) => {
        acc[user.firebaseUid] = user;
        return acc;
      }, {});

      // Build leaderboard entries
      const entries = userIds.map(userId => {
        const user = userMap[userId];
        let displayName = 'Unknown';
        
        if (user?.name && user.name !== user.email?.split('@')[0]) {
          displayName = user.name;
        } else if (user?.email) {
          displayName = user.email.split('@')[0];
        }

        return {
          userId,
          username: displayName,
          avatar: null, // Avatar support can be added later
          totalXp: xpMap[userId] || 0,
          currentStreak: streakMap[userId] || 0,
          isCurrentUser: userId === currentUserId
        };
      });

      // Requirement 21.3-21.5: Sort by XP desc → streak desc → username asc
      entries.sort((a, b) => {
        if (b.totalXp !== a.totalXp) {
          return b.totalXp - a.totalXp;
        }
        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }
        return a.username.localeCompare(b.username);
      });

      // Requirement 21.7: Assign rank numbers starting from 1
      const leaderboard = entries.map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

      return leaderboard;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        currentUserId,
        operation: 'getRoomLeaderboard',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('roomId', roomId, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getRoomLeaderboard', error, { roomId, currentUserId });
      }

      throw error;
    }
  }

  /**
   * Get a user's total XP in a specific room.
   * Requirements: 19.4
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<number>} Total XP earned in the room
   */
  async getUserRoomXp(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      // Requirement 19.4: Calculate room XP by summing room_xp_ledger entries
      const result = await RoomXpLedger.aggregate([
        { $match: { roomId: roomId, userId } },
        { $group: { _id: null, totalXp: { $sum: '$xpAmount' } } }
      ]);

      const totalXp = result.length > 0 ? result[0].totalXp : 0;

      return totalXp;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        operation: 'getUserRoomXp',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('id', error.value, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('getUserRoomXp', error, { roomId, userId });
      }

      throw error;
    }
  }

  /**
   * Update streak for a user in a room based on practice activity.
   * Requirements: 23.1-23.7
   * 
   * Streak logic:
   * - If last_activity_date is yesterday: increment current_streak by 1
   * - If last_activity_date is today: no change to current_streak
   * - If last_activity_date is > 1 day ago: reset current_streak to 1
   * - Update longest_streak if current_streak exceeds it
   * - Update last_activity_date to today
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated streak record with { currentStreak, longestStreak, isNewDay }
   */
  async updateStreak(roomId, userId) {
    if (!roomId) {
      throw new ValidationError('roomId', roomId, { type: 'required' });
    }

    if (!userId) {
      throw new ValidationError('userId', userId, { type: 'required' });
    }

    try {
      const now = new Date();
      const today = RoomXpService._toUTCDay(now);

      // Find or create streak record
      let streak = await RoomStreak.findOne({ roomId, userId });

      // Requirement 23.1: Check last_activity_date
      if (!streak) {
        // First practice in this room - create new streak record
        streak = await RoomStreak.create({
          roomId,
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
          lastResetAt: null
        });

        // Broadcast streak update for new streak
        WebSocketService.broadcastRoomStreakUpdated(roomId, userId, {
          currentStreak: 1,
          longestStreak: 1,
          isNewRecord: true
        });

        await ErrorLoggingService.logSystemEvent('room_streak_created', {
          roomId,
          userId,
          currentStreak: 1,
          timestamp: new Date().toISOString()
        });

        return {
          currentStreak: 1,
          longestStreak: 1,
          isNewDay: true
        };
      }

      // No last activity date - treat as first practice
      if (!streak.lastActivityDate) {
        streak.currentStreak = 1;
        streak.longestStreak = Math.max(streak.longestStreak, 1);
        streak.lastActivityDate = today;
        await streak.save();

        // Broadcast streak update
        WebSocketService.broadcastRoomStreakUpdated(roomId, userId, {
          currentStreak: 1,
          longestStreak: streak.longestStreak,
          isNewRecord: streak.longestStreak === 1
        });

        return {
          currentStreak: 1,
          longestStreak: streak.longestStreak,
          isNewDay: true
        };
      }

      const daysSinceLastActivity = RoomXpService._dayDiff(now, streak.lastActivityDate);

      // Requirement 23.3: If today, no change to current_streak
      if (daysSinceLastActivity === 0) {
        return {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          isNewDay: false
        };
      }

      // Requirement 23.2: If yesterday, increment current_streak by 1
      if (daysSinceLastActivity === 1) {
        streak.currentStreak += 1;
        
        // Requirement 23.5: Update longest_streak if current_streak exceeds it
        const isNewRecord = streak.currentStreak > streak.longestStreak;
        if (isNewRecord) {
          streak.longestStreak = streak.currentStreak;
        }
        
        // Requirement 23.6: Update last_activity_date to today
        streak.lastActivityDate = today;
        await streak.save();

        // Broadcast streak update
        WebSocketService.broadcastRoomStreakUpdated(roomId, userId, {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          isNewRecord
        });

        await ErrorLoggingService.logSystemEvent('room_streak_incremented', {
          roomId,
          userId,
          currentStreak: streak.currentStreak,
          isNewRecord,
          timestamp: new Date().toISOString()
        });

        return {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          isNewDay: true
        };
      }

      // Requirement 23.4: If > 1 day ago, reset current_streak to 1
      streak.currentStreak = 1;
      streak.lastActivityDate = today;
      await streak.save();

      // Broadcast streak reset
      WebSocketService.broadcastRoomStreakUpdated(roomId, userId, {
        currentStreak: 1,
        longestStreak: streak.longestStreak,
        isNewRecord: false
      });

      await ErrorLoggingService.logSystemEvent('room_streak_reset', {
        roomId,
        userId,
        daysSinceLastActivity,
        timestamp: new Date().toISOString()
      });

      return {
        currentStreak: 1,
        longestStreak: streak.longestStreak,
        isNewDay: true
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        roomId,
        userId,
        operation: 'updateStreak',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'CastError') {
        throw new ValidationError('id', error.value, { type: 'format', format: 'ObjectId' });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('updateStreak', error, { roomId, userId });
      }

      throw error;
    }
  }

  /**
   * Reset all room streaks for weekly reset (Monday 00:00 UTC).
   * Requirements: 24.1-24.7
   * 
   * Weekly reset:
   * - Set current_streak to 0 for all room_streaks records
   * - Retain longest_streak values
   * - Retain room XP totals
   * - Update last_reset_at timestamp
   * 
   * @returns {Promise<Object>} Reset statistics { resetCount, timestamp }
   */
  async resetWeeklyStreaks() {
    try {
      const now = new Date();

      // Requirement 24.2: Set current_streak to 0 for all room_streaks records
      // Requirement 24.3: Retain longest_streak values
      // Requirement 24.5: Update last_reset_at timestamp
      const result = await RoomStreak.updateMany(
        {},
        {
          $set: {
            currentStreak: 0,
            lastResetAt: now
          }
        }
      );

      await ErrorLoggingService.logSystemEvent('room_weekly_streak_reset', {
        resetCount: result.modifiedCount,
        timestamp: now.toISOString()
      });

      return {
        resetCount: result.modifiedCount,
        timestamp: now
      };
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        operation: 'resetWeeklyStreaks',
        timestamp: new Date().toISOString()
      });

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new DatabaseError('resetWeeklyStreaks', error, {});
      }

      throw error;
    }
  }
}

export default new RoomXpService();
