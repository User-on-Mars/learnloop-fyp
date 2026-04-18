import RoomSkillMap from '../models/RoomSkillMap.js';
import ErrorLoggingService from './ErrorLoggingService.js';

/**
 * RoomSkillMapDetector - Helper service to detect if a skill map belongs to a room.
 * Used to determine whether to award room XP or global XP on node completion.
 * 
 * Requirements: 15.1-15.5, 18.1-18.4, 19.1-19.5, 20.1-20.5
 */
class RoomSkillMapDetector {
  /**
   * Check if a skill map belongs to any room.
   * 
   * @param {string} skillMapId - Skill map ID to check
   * @returns {Promise<Object|null>} Room info { roomId, skillMapId } if found, null otherwise
   */
  async getRoomForSkillMap(skillMapId) {
    if (!skillMapId) {
      return null;
    }

    try {
      // Check if this skill map is associated with any room
      const roomSkillMap = await RoomSkillMap.findOne({ skillMapId }).lean();

      if (roomSkillMap) {
        return {
          roomId: roomSkillMap.roomId.toString(),
          skillMapId: roomSkillMap.skillMapId.toString()
        };
      }

      return null;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        skillMapId,
        operation: 'getRoomForSkillMap',
        timestamp: new Date().toISOString()
      });
      
      // Return null on error to fall back to global XP
      return null;
    }
  }

  /**
   * Check if a skill map belongs to a specific room.
   * 
   * @param {string} skillMapId - Skill map ID to check
   * @param {string} roomId - Room ID to check
   * @returns {Promise<boolean>} True if skill map belongs to the room, false otherwise
   */
  async isRoomSkillMap(skillMapId, roomId) {
    if (!skillMapId || !roomId) {
      return false;
    }

    try {
      const roomSkillMap = await RoomSkillMap.findOne({
        skillMapId,
        roomId
      }).lean();

      return roomSkillMap !== null;
    } catch (error) {
      await ErrorLoggingService.logError(error, {
        skillMapId,
        roomId,
        operation: 'isRoomSkillMap',
        timestamp: new Date().toISOString()
      });
      
      // Return false on error to fall back to global XP
      return false;
    }
  }
}

export default new RoomSkillMapDetector();
