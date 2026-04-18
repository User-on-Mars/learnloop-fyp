import InvitationExpiryScheduler from '../InvitationExpiryScheduler.js';
import InvitationService from '../InvitationService.js';

// Mock the InvitationService
jest.mock('../InvitationService.js');

describe('InvitationExpiryScheduler Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    InvitationExpiryScheduler.stop();
  });

  it('should call InvitationService.expireInvitations when job runs', async () => {
    // Mock the expireInvitations method
    const mockResult = {
      expiredCount: 2,
      timestamp: new Date().toISOString()
    };
    InvitationService.expireInvitations.mockResolvedValue(mockResult);

    // Create a spy on the private method to test it directly
    const scheduler = InvitationExpiryScheduler;
    
    // Call the private method directly for testing
    await scheduler._runExpiryJob();

    // Verify that expireInvitations was called
    expect(InvitationService.expireInvitations).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully during job execution', async () => {
    // Mock the expireInvitations method to throw an error
    const mockError = new Error('Database connection failed');
    InvitationService.expireInvitations.mockRejectedValue(mockError);

    // Spy on console.error to verify error logging
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Call the private method directly for testing
    await InvitationExpiryScheduler._runExpiryJob();

    // Verify that the error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Invitation expiry job failed:',
      'Database connection failed'
    );

    // Clean up
    consoleSpy.mockRestore();
  });

  it('should schedule job correctly on start', () => {
    // Spy on setTimeout to verify scheduling
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => {});

    InvitationExpiryScheduler.start();

    // Verify that setTimeout was called (for initial alignment)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    );

    // Clean up
    setTimeoutSpy.mockRestore();
  });
});