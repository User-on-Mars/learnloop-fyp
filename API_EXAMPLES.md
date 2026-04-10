# XP System API Examples

## Practice Session with XP Award

### Request
```http
POST /api/practice
Authorization: Bearer <token>
Content-Type: application/json

{
  "skillName": "JavaScript",
  "minutesPracticed": 15,
  "tags": ["coding", "frontend"],
  "notes": "Practiced React hooks",
  "confidence": 4
}
```

### Response (No Streak)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "skillName": "JavaScript",
  "minutesPracticed": 15,
  "tags": ["coding", "frontend"],
  "notes": "Practiced React hooks",
  "confidence": 4,
  "date": "2026-04-10T14:30:00.000Z",
  "createdAt": "2026-04-10T14:30:00.000Z",
  "updatedAt": "2026-04-10T14:30:00.000Z",
  "xpAwarded": {
    "baseAmount": 30,
    "multiplier": 1,
    "finalAmount": 30
  }
}
```

### Response (5-Day Streak)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "skillName": "JavaScript",
  "minutesPracticed": 15,
  "xpAwarded": {
    "baseAmount": 30,
    "multiplier": 2,
    "finalAmount": 60
  }
}
```

### Response (7+ Day Streak)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "skillName": "JavaScript",
  "minutesPracticed": 15,
  "xpAwarded": {
    "baseAmount": 30,
    "multiplier": 5,
    "finalAmount": 150
  }
}
```

## Reflection with XP Award

### Request
```http
POST /api/reflections
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Today's Learning",
  "content": "Made great progress on understanding async/await patterns...",
  "mood": "Energized",
  "tags": ["javascript", "async"]
}
```

### Response (First Reflection Today)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "user123",
  "title": "Today's Learning",
  "content": "Made great progress on understanding async/await patterns...",
  "mood": "Energized",
  "tags": ["javascript", "async"],
  "createdAt": "2026-04-10T14:30:00.000Z",
  "updatedAt": "2026-04-10T14:30:00.000Z",
  "xpAwarded": {
    "baseAmount": 20,
    "multiplier": 1,
    "finalAmount": 20
  }
}
```

### Response (Second Reflection Same Day - Daily Cap)
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "user123",
  "title": "Evening Reflection",
  "content": "Continued learning...",
  "mood": "Thoughtful",
  "tags": ["learning"],
  "createdAt": "2026-04-10T20:30:00.000Z",
  "updatedAt": "2026-04-10T20:30:00.000Z",
  "xpAwarded": null
}
```

## Get User XP Profile

### Request
```http
GET /api/xp/profile
Authorization: Bearer <token>
```

### Response
```json
{
  "totalXp": 1250,
  "weeklyXp": 340,
  "currentStreak": 7,
  "leagueTier": "Silver",
  "weeklyRank": 15,
  "streakMultiplierActive": true,
  "activeMultiplier": 5
}
```

## Admin: Get XP Settings

### Request
```http
GET /admin/xp-settings
Authorization: Bearer <admin-token>
```

### Response
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "reflectionXp": 20,
  "practiceXpPerMinute": 2,
  "streak5DayMultiplier": 2,
  "streak7DayMultiplier": 5,
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-10T10:00:00.000Z"
}
```

## Admin: Update XP Settings

### Request
```http
PUT /admin/xp-settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reflectionXp": 25,
  "practiceXpPerMinute": 3,
  "streak5DayMultiplier": 2.5,
  "streak7DayMultiplier": 6
}
```

### Response
```json
{
  "message": "XP settings updated",
  "settings": {
    "_id": "507f1f77bcf86cd799439014",
    "reflectionXp": 25,
    "practiceXpPerMinute": 3,
    "streak5DayMultiplier": 2.5,
    "streak7DayMultiplier": 6,
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-10T14:30:00.000Z"
  }
}
```

## XP Transaction Examples

### Practice Transaction
```json
{
  "_id": "507f1f77bcf86cd799439015",
  "userId": "user123",
  "source": "practice",
  "baseAmount": 30,
  "multiplier": 2,
  "finalAmount": 60,
  "referenceId": "507f1f77bcf86cd799439011",
  "metadata": {
    "streakDays": 5,
    "minutesPracticed": 15,
    "skillName": "JavaScript"
  },
  "createdAt": "2026-04-10T14:30:00.000Z",
  "updatedAt": "2026-04-10T14:30:00.000Z"
}
```

### Reflection Transaction
```json
{
  "_id": "507f1f77bcf86cd799439016",
  "userId": "user123",
  "source": "reflection",
  "baseAmount": 20,
  "multiplier": 5,
  "finalAmount": 100,
  "referenceId": "507f1f77bcf86cd799439012",
  "metadata": {
    "streakDays": 7
  },
  "createdAt": "2026-04-10T14:30:00.000Z",
  "updatedAt": "2026-04-10T14:30:00.000Z"
}
```

## Error Responses

### Invalid XP Settings (Out of Range)
```json
{
  "message": "reflectionXp must be between 0 and 1000"
}
```

### Unauthorized Access
```json
{
  "message": "Admin access required"
}
```

### Validation Error
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "minutesPracticed",
      "message": "Must be between 1 and 1440"
    }
  ]
}
```

## Calculation Examples

### Example 1: Practice with 5-Day Streak
- Minutes practiced: 20
- XP per minute: 2 (default)
- Base XP: 20 × 2 = 40
- Streak: 5 days
- Multiplier: 2x
- **Final XP: 40 × 2 = 80**

### Example 2: Reflection with 7-Day Streak
- Reflection XP: 20 (default)
- Base XP: 20
- Streak: 7 days
- Multiplier: 5x
- **Final XP: 20 × 5 = 100**

### Example 3: Practice with Custom Settings
- Minutes practiced: 30
- XP per minute: 3 (admin changed)
- Base XP: 30 × 3 = 90
- Streak: 10 days
- Multiplier: 5x (7+ day multiplier)
- **Final XP: 90 × 5 = 450**

### Example 4: Multiple Activities Same Day
- Morning: 15 min practice → 30 XP (no streak)
- Afternoon: Reflection → 20 XP (no streak)
- Evening: 10 min practice → 20 XP (no streak)
- Second reflection → 0 XP (daily cap)
- **Total Daily XP: 70**

### Example 5: Streak Progression
- Day 1-4: 1x multiplier
- Day 5-6: 2x multiplier
- Day 7+: 5x multiplier
- Streak breaks: Back to 1x multiplier
