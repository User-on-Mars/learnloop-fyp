import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import XpSettings from '../XpSettings.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await XpSettings.deleteMany({});
});

describe('XpSettings Model', () => {
  test('should create default settings', async () => {
    const settings = await XpSettings.getSettings();
    
    expect(settings.reflectionXp).toBe(20);
    expect(settings.practiceXpPerMinute).toBe(2);
    expect(settings.streak5DayMultiplier).toBe(2);
    expect(settings.streak7DayMultiplier).toBe(5);
  });

  test('should return existing settings if already created', async () => {
    const settings1 = await XpSettings.getSettings();
    const settings2 = await XpSettings.getSettings();
    
    expect(settings1._id.toString()).toBe(settings2._id.toString());
  });

  test('should update settings', async () => {
    await XpSettings.getSettings();
    
    const updated = await XpSettings.updateSettings({
      reflectionXp: 50,
      practiceXpPerMinute: 5
    });
    
    expect(updated.reflectionXp).toBe(50);
    expect(updated.practiceXpPerMinute).toBe(5);
    expect(updated.streak5DayMultiplier).toBe(2); // unchanged
  });

  test('should validate XP ranges', async () => {
    const settings = new XpSettings({
      reflectionXp: -10 // invalid
    });
    
    await expect(settings.validate()).rejects.toThrow();
  });

  test('should enforce max values', async () => {
    const settings = new XpSettings({
      reflectionXp: 2000 // exceeds max
    });
    
    await expect(settings.validate()).rejects.toThrow();
  });

  test('should allow decimal multipliers', async () => {
    const updated = await XpSettings.updateSettings({
      streak5DayMultiplier: 2.5,
      streak7DayMultiplier: 7.5
    });
    
    expect(updated.streak5DayMultiplier).toBe(2.5);
    expect(updated.streak7DayMultiplier).toBe(7.5);
  });
});
