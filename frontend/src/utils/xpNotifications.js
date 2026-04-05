/**
 * Show XP earned notification
 * @param {Function} showSuccess - Toast success function
 * @param {Object} xpData - XP data from backend { type, amount, skillMapName? }
 */
export function showXpNotification(showSuccess, xpData) {
  if (!xpData || !xpData.amount) return;

  const messages = {
    session_completion: `🎉 +${xpData.amount} XP earned for completing your practice session!`,
    session_with_streak: `🔥 +${xpData.amount} XP earned! (Session + Streak Bonus)`,
    reflection: `📝 +${xpData.amount} XP earned for your reflection!`,
    skillmap_completion: xpData.skillMapName 
      ? `🏆 +${xpData.amount} XP! You completed "${xpData.skillMapName}"!`
      : `🏆 +${xpData.amount} XP earned for completing the skill map!`,
    streak_bonus: `🔥 +${xpData.amount} XP streak bonus!`
  };

  const message = messages[xpData.type] || `+${xpData.amount} XP earned!`;
  showSuccess(message);
}
