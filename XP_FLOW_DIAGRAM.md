# XP System Flow Diagram

## User Actions → XP Award Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────┬─────────────────┐
                              ▼                 ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                    │   Practice   │  │  Reflection  │  │   Session    │
                    │   Session    │  │    Entry     │  │  Complete    │
                    └──────────────┘  └──────────────┘  └──────────────┘
                              │                 │                 │
                              │                 │                 │
                              ▼                 ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                    │ Calculate XP │  │ Calculate XP │  │  No XP       │
                    │ minutes × 2  │  │   20 XP      │  │  Awarded     │
                    └──────────────┘  └──────────────┘  └──────────────┘
                              │                 │                 │
                              │                 │                 │
                              ▼                 ▼                 ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Check Daily Cap & Constraints            │
                    │  - Practice: No cap                              │
                    │  - Reflection: 1 per day                         │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │           Get User's Current Streak              │
                    │  - Query UserStreak collection                   │
                    │  - Returns: currentStreak (days)                 │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Determine Streak Multiplier              │
                    │  - 0-4 days: 1x                                  │
                    │  - 5-6 days: 2x (configurable)                   │
                    │  - 7+ days: 5x (configurable)                    │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Calculate Final XP Amount                │
                    │  finalXP = baseXP × multiplier                   │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Create XP Transaction Record             │
                    │  - userId, source, baseAmount                    │
                    │  - multiplier, finalAmount                       │
                    │  - metadata (streakDays, etc.)                   │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Update User XP Profile                   │
                    │  - totalXp += finalAmount                        │
                    │  - weeklyXp += finalAmount                       │
                    │  - Recalculate league tier                       │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Update Leaderboard Cache                 │
                    │  - Clear relevant cache entries                  │
                    │  - Rankings update within 5 minutes              │
                    └──────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────┐
                    │         Return Response to User                  │
                    │  - Practice/Reflection data                      │
                    │  - xpAwarded object                              │
                    │    { baseAmount, multiplier, finalAmount }       │
                    └──────────────────────────────────────────────────┘
```

## Streak Multiplier Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    STREAK CALCULATION                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Get Last Practice   │
                    │  Date from Streak    │
                    └──────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Same Day │  │Next Day  │  │  Gap >1  │
        │ (diff=0) │  │(diff=1)  │  │  (diff>1)│
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  No-op   │  │Increment │  │  Reset   │
        │ Keep     │  │ Streak   │  │ Streak   │
        │ Current  │  │  +1      │  │  to 1    │
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              ▼
                    ┌──────────────────────┐
                    │  Update UserStreak   │
                    │  - currentStreak     │
                    │  - lastPracticeDate  │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Return Streak Info  │
                    │  { streakCount,      │
                    │    isNewDay }        │
                    └──────────────────────┘
```

## Admin XP Settings Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN SETTINGS UPDATE                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Admin Opens         │
                    │  Settings Page       │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Fetch Current       │
                    │  XP Settings         │
                    │  GET /admin/         │
                    │  xp-settings         │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Display Settings    │
                    │  in Edit Form        │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Admin Modifies      │
                    │  Values              │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Validate Ranges     │
                    │  - reflectionXp:     │
                    │    0-1000            │
                    │  - practiceXpPerMin: │
                    │    0-100             │
                    │  - multipliers: 1-10 │
                    └──────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Valid   │  │ Invalid  │  │  Cancel  │
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Save    │  │  Show    │  │  Revert  │
        │  PUT     │  │  Error   │  │  Changes │
        │  Request │  │  Message │  │          │
        └──────────┘  └──────────┘  └──────────┘
                │
                ▼
        ┌──────────────────────┐
        │  Update XpSettings   │
        │  Document            │
        └──────────────────────┘
                │
                ▼
        ┌──────────────────────┐
        │  Log to Audit Trail  │
        │  - adminId           │
        │  - action            │
        │  - changes           │
        └──────────────────────┘
                │
                ▼
        ┌──────────────────────┐
        │  Return Success      │
        │  Show Confirmation   │
        └──────────────────────┘
                │
                ▼
        ┌──────────────────────┐
        │  New Settings Apply  │
        │  Immediately to All  │
        │  Future XP Awards    │
        └──────────────────────┘
```

## XP Calculation Examples

### Example 1: Practice Session (No Streak)
```
Input:
  - Minutes: 15
  - XP/min: 2
  - Streak: 0 days

Calculation:
  baseXP = 15 × 2 = 30
  multiplier = 1 (no streak)
  finalXP = 30 × 1 = 30

Output: 30 XP
```

### Example 2: Practice Session (5-Day Streak)
```
Input:
  - Minutes: 15
  - XP/min: 2
  - Streak: 5 days

Calculation:
  baseXP = 15 × 2 = 30
  multiplier = 2 (5-day bonus)
  finalXP = 30 × 2 = 60

Output: 60 XP
```

### Example 3: Reflection (7-Day Streak)
```
Input:
  - Reflection XP: 20
  - Streak: 7 days

Calculation:
  baseXP = 20
  multiplier = 5 (7+ day bonus)
  finalXP = 20 × 5 = 100

Output: 100 XP
```

### Example 4: Daily Activity Summary
```
Morning:
  - Practice 20 min → 40 XP (no streak)
  - Reflection → 20 XP (no streak)

Afternoon:
  - Practice 30 min → 60 XP (no streak)

Evening:
  - Practice 10 min → 20 XP (no streak)
  - Second reflection → 0 XP (daily cap)

Total Daily XP: 140 XP
```

## Database Collections Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE COLLECTIONS                          │
└─────────────────────────────────────────────────────────────────┘

XpSettings (Singleton)
  ├─ reflectionXp: 20
  ├─ practiceXpPerMinute: 2
  ├─ streak5DayMultiplier: 2
  └─ streak7DayMultiplier: 5
           │
           │ (Read on every XP award)
           ▼
XpTransaction (Many)
  ├─ userId: "user123"
  ├─ source: "practice"
  ├─ baseAmount: 30
  ├─ multiplier: 2
  ├─ finalAmount: 60
  └─ metadata: { streakDays: 5, minutesPracticed: 15 }
           │
           │ (Aggregate for totals)
           ▼
UserXpProfile (One per user)
  ├─ userId: "user123"
  ├─ totalXp: 1250
  ├─ weeklyXp: 340
  ├─ leagueTier: "Silver"
  └─ weekStartDate: "2026-04-07"
           │
           │ (Used for leaderboard)
           ▼
Leaderboard Rankings
  ├─ Weekly: Sorted by weeklyXp
  ├─ All-Time: Sorted by totalXp
  └─ Streaks: Sorted by currentStreak
```
