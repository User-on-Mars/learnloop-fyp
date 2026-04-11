/**
 * Show XP earned notification
 * @param {Function} showSuccess - Toast success function
 * @param {Object} xpData - XP data from backend { baseAmount, multiplier, finalAmount }
 */
export function showXpNotification(showSuccess, xpData) {
  if (!xpData || !xpData.finalAmount) return;

  const { baseAmount, multiplier, finalAmount } = xpData;
  
  // Build message based on multiplier
  let message = `🎉 +${finalAmount} XP earned!`;
  
  if (multiplier > 1) {
    message = `🔥 +${finalAmount} XP earned! (${baseAmount} XP × ${multiplier}x streak bonus)`;
  }

  showSuccess(message, 5000); // Show for 5 seconds
}

