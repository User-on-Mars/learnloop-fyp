# Requirements Document

## Introduction

The XP Leaderboard System adds gamification to LearnLoop through experience points (XP), practice streaks, and weekly leaderboards. Users earn XP by completing practice sessions, finishing skill map nodes, writing reflections, and maintaining daily practice streaks. A 7-day streak multiplier doubles all XP earned that day. Three leaderboard views rank users: weekly XP (the main competition with tiered leagues and promotion/relegation), current streak length, and all-time XP. Weekly leagues reset every Monday, with users placed into Gold, Silver, Bronze, or Newcomer tiers based on their weekly XP rank. Promotion and relegation between Gold and Silver tiers occur automatically at each weekly reset.

## Glossary

- **XP_Service**: The backend service responsible for calculating, awarding, and persisting XP transactions for users
- **XP_Transaction**: A single record of XP earned by a user, including the source action, base amount, multiplier applied, final amount, and timestamp
- **Streak_Service**: The backend service responsible for tracking and calculating consecutive daily practice streaks for users
- **Practice_Streak**: The count of consecutive calendar days on which a user has completed at least one practice session of 10 or more minutes
- **Streak_Multiplier**: A factor of 2 applied to all XP earned on a day when the user has a Practice_Streak of 7 or more consecutive days
- **Leaderboard_Service**: The backend service responsible for computing and serving leaderboard rankings
- **Weekly_XP_Board**: A leaderboard ranking all users by XP earned during the current week (Monday 00:00 UTC to Sunday 23:59 UTC)
- **Streak_Board**: A leaderboard ranking all users by their current Practice_Streak length
- **AllTime_XP_Board**: A leaderboard ranking all users by their total accumulated XP
- **League_Tier**: One of four ranked tiers (Gold, Silver, Bronze, Newcomer) assigned to users based on their Weekly_XP_Board rank
- **Weekly_Reset**: The process that occurs every Monday at 00:00 UTC, resetting weekly XP totals and applying promotion/relegation between League_Tiers
- **Promotion**: The movement of the top 3 users from Silver League_Tier to Gold League_Tier during Weekly_Reset
- **Relegation**: The movement of the bottom 3 users from Gold League_Tier to Silver League_Tier during Weekly_Reset
- **Template_Skill_Map**: A Skill_Map created from a pre-built Template, distinguished from user-created Skill_Maps
- **XP_Profile**: The UI component displaying a user's total XP, current Practice_Streak, current League_Tier, and weekly XP progress
- **Leaderboard_Page**: The frontend page displaying the three leaderboard views with tab navigation

## Requirements

### Requirement 1: XP Award for Session Completion

**User Story:** As a learner, I want to earn XP when I complete a practice session, so that I am rewarded for putting in focused practice time.

#### Acceptance Criteria

1. WHEN a user completes a practice session with 10 or more minutes practiced, THE XP_Service SHALL award 10 base XP to the user
2. WHEN a user completes a practice session with fewer than 10 minutes practiced, THE XP_Service SHALL award 0 XP for session completion
3. THE XP_Service SHALL award session completion XP at most once per user per calendar day (UTC)
4. WHEN a user has already earned session completion XP on the current calendar day (UTC) and completes another qualifying session, THE XP_Service SHALL not award additional session completion XP
5. WHEN a user completes a qualifying session, THE XP_Service SHALL create an XP_Transaction recording the source as "session_completion", the base amount, the multiplier applied, and the final amount


### Requirement 3: XP Award for Reflection Submission

**User Story:** As a learner, I want to earn XP when I write a reflection, so that I am encouraged to reflect on my practice.

#### Acceptance Criteria

1. WHEN a user submits a Reflection containing a mood and content, THE XP_Service SHALL award 20 base XP to the user
2. THE XP_Service SHALL award reflection XP at most once per user per calendar day (UTC)
3. WHEN a user has already earned reflection XP on the current calendar day (UTC) and submits another Reflection, THE XP_Service SHALL not award additional reflection XP
4. WHEN a user submits a qualifying Reflection, THE XP_Service SHALL create an XP_Transaction recording the source as "reflection", the base amount, the multiplier applied, and the final amount

### Requirement 4: Daily Streak Bonus XP

**User Story:** As a learner, I want to earn bonus XP for each day of my practice streak, so that I am rewarded for consistent daily practice.

#### Acceptance Criteria

1. WHEN a user completes a qualifying practice session (10 or more minutes) and the Streak_Service confirms the user has an active Practice_Streak, THE XP_Service SHALL award 5 XP multiplied by the current streak day count as streak bonus XP
2. WHEN a user's Practice_Streak is 1 day (first day), THE XP_Service SHALL award 5 streak bonus XP
3. WHEN a user's Practice_Streak is 5 days, THE XP_Service SHALL award 25 streak bonus XP
4. THE XP_Service SHALL award streak bonus XP at most once per user per calendar day (UTC), at the time the first qualifying session is completed that day
5. WHEN a user earns streak bonus XP, THE XP_Service SHALL create an XP_Transaction recording the source as "streak_bonus", the streak day count, the base amount, the multiplier applied, and the final amount

### Requirement 5: Skill Map Completion XP

**User Story:** As a learner, I want to earn a large XP bonus when I finish an entire template skill map, so that I am motivated to complete structured learning paths.

#### Acceptance Criteria

1. WHEN a user completes all Nodes on a Template_Skill_Map, THE XP_Service SHALL award 200 base XP to the user
2. WHEN a user completes all Nodes on a user-created (non-template) Skill_Map, THE XP_Service SHALL not award skill map completion XP
3. THE XP_Service SHALL award skill map completion XP only once per Template_Skill_Map per user
4. WHEN a user earns skill map completion XP, THE XP_Service SHALL create an XP_Transaction recording the source as "skillmap_completion", the Skill_Map identifier, the base amount, the multiplier applied, and the final amount

### Requirement 6: Seven-Day Streak Multiplier

**User Story:** As a learner, I want all my XP to be doubled when I have a 7-day or longer streak, so that I am strongly incentivized to maintain long practice streaks.

#### Acceptance Criteria

1. WHILE a user has a Practice_Streak of 7 or more consecutive days, THE XP_Service SHALL apply a Streak_Multiplier of 2 to all XP earned by that user on that calendar day (UTC)
2. WHILE a user has a Practice_Streak of fewer than 7 consecutive days, THE XP_Service SHALL apply a Streak_Multiplier of 1 (no multiplier) to all XP earned
3. THE XP_Service SHALL apply the Streak_Multiplier to all XP sources: session completion, node completion, reflection, streak bonus, and skill map completion
4. EACH XP_Transaction SHALL record both the base XP amount and the final XP amount after the Streak_Multiplier is applied
5. FOR ALL XP_Transactions, the final amount SHALL equal the base amount multiplied by the Streak_Multiplier (round-trip property: final_amount = base_amount × multiplier)

### Requirement 7: Practice Streak Tracking

**User Story:** As a learner, I want my consecutive practice days tracked automatically, so that I can see my streak and earn streak-based rewards.

#### Acceptance Criteria

1. THE Streak_Service SHALL increment a user's Practice_Streak by 1 when the user completes a qualifying practice session (10 or more minutes) on a new calendar day (UTC) that is exactly 1 day after the user's last practice day
2. WHEN a user completes a qualifying practice session on a calendar day (UTC) that is more than 1 day after the user's last practice day, THE Streak_Service SHALL reset the Practice_Streak to 1
3. WHEN a user completes multiple qualifying practice sessions on the same calendar day (UTC), THE Streak_Service SHALL count that day only once toward the Practice_Streak
4. THE Streak_Service SHALL persist the user's current Practice_Streak count and the date of the last qualifying practice day
5. WHEN a user has no prior practice history, THE Streak_Service SHALL set the Practice_Streak to 1 upon the first qualifying session completion
6. FOR ALL streak calculations, incrementing a streak then decrementing the last practice day by one SHALL restore the previous streak state (idempotence of day-based tracking)

### Requirement 8: Weekly XP Leaderboard

**User Story:** As a learner, I want to see how my weekly XP compares to other users, so that I am motivated by friendly competition.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL compute the Weekly_XP_Board by summing all XP_Transactions for each user within the current week (Monday 00:00 UTC to Sunday 23:59 UTC)
2. THE Leaderboard_Service SHALL rank users on the Weekly_XP_Board in descending order of weekly XP earned
3. WHEN two or more users have the same weekly XP, THE Leaderboard_Service SHALL rank the user who earned the XP earlier (earlier first XP_Transaction timestamp in the week) higher
4. THE Leaderboard_Service SHALL include all users who have earned at least 1 XP during the current week on the Weekly_XP_Board
5. THE Leaderboard_Service SHALL return each entry with the user display name, weekly XP total, rank position, and League_Tier

### Requirement 9: League Tier Assignment

**User Story:** As a learner, I want to be placed in a league tier based on my weekly ranking, so that I can see my competitive standing.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL assign the Gold League_Tier to users ranked 1 through 10 on the Weekly_XP_Board
2. THE Leaderboard_Service SHALL assign the Silver League_Tier to users ranked 11 through 30 on the Weekly_XP_Board
3. THE Leaderboard_Service SHALL assign the Bronze League_Tier to users ranked 31 through 100 on the Weekly_XP_Board
4. THE Leaderboard_Service SHALL assign the Newcomer League_Tier to all users ranked below 100 on the Weekly_XP_Board and to users with 0 weekly XP
5. WHEN the total number of ranked users is fewer than the tier boundary (e.g., fewer than 10 users), THE Leaderboard_Service SHALL assign tiers based on actual rank positions without padding

### Requirement 10: Weekly Reset and Promotion/Relegation

**User Story:** As a learner, I want leagues to reset weekly with promotion and relegation, so that the competition stays fresh and rewards consistent effort.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL execute a Weekly_Reset every Monday at 00:00 UTC
2. DURING Weekly_Reset, THE Leaderboard_Service SHALL reset all users' weekly XP totals to 0
3. DURING Weekly_Reset, THE Leaderboard_Service SHALL promote the top 3 users from Silver League_Tier to Gold League_Tier based on the previous week's final Weekly_XP_Board rankings
4. DURING Weekly_Reset, THE Leaderboard_Service SHALL relegate the bottom 3 users from Gold League_Tier to Silver League_Tier based on the previous week's final Weekly_XP_Board rankings
5. IF the Gold League_Tier has fewer than 4 users at Weekly_Reset, THEN THE Leaderboard_Service SHALL not relegate any users from Gold
6. IF the Silver League_Tier has fewer than 4 users at Weekly_Reset, THEN THE Leaderboard_Service SHALL not promote any users to Gold
7. THE Leaderboard_Service SHALL persist a history record of each Weekly_Reset including the date, promotions, and relegations applied

### Requirement 11: Streak Leaderboard

**User Story:** As a learner, I want to see a leaderboard ranked by current streak length, so that daily consistency is recognized independently of session length.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL compute the Streak_Board by ranking all users with a Practice_Streak of 1 or more days in descending order of streak length
2. WHEN two or more users have the same Practice_Streak length, THE Leaderboard_Service SHALL rank the user whose streak started earlier higher
3. THE Leaderboard_Service SHALL return each Streak_Board entry with the user display name, current Practice_Streak count, and rank position
4. THE Leaderboard_Service SHALL exclude users with a Practice_Streak of 0 from the Streak_Board

### Requirement 12: All-Time XP Leaderboard

**User Story:** As a learner, I want to see a leaderboard of total XP accumulated over all time, so that long-term dedication is recognized.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL compute the AllTime_XP_Board by summing all XP_Transactions for each user across all time
2. THE Leaderboard_Service SHALL rank users on the AllTime_XP_Board in descending order of total XP
3. WHEN two or more users have the same total XP, THE Leaderboard_Service SHALL rank the user who registered earlier higher
4. THE Leaderboard_Service SHALL return each AllTime_XP_Board entry with the user display name, total XP, and rank position

### Requirement 13: XP Profile Display

**User Story:** As a learner, I want to see my XP stats at a glance, so that I can track my gamification progress.

#### Acceptance Criteria

1. THE XP_Profile SHALL display the user's total accumulated XP
2. THE XP_Profile SHALL display the user's current Practice_Streak in days
3. THE XP_Profile SHALL display the user's current League_Tier with the corresponding tier icon (🏆 Gold, 🥈 Silver, 🥉 Bronze, ⭐ Newcomer)
4. THE XP_Profile SHALL display the user's XP earned during the current week
5. THE XP_Profile SHALL display the user's current rank on the Weekly_XP_Board
6. WHILE the user has a Practice_Streak of 7 or more days, THE XP_Profile SHALL display a "×2 XP Active" indicator
7. THE XP_Profile SHALL be accessible from the Dashboard and the Leaderboard_Page

### Requirement 14: Leaderboard Page with Tab Navigation

**User Story:** As a learner, I want to switch between leaderboard views easily, so that I can explore different rankings.

#### Acceptance Criteria

1. THE Leaderboard_Page SHALL display three tabs: "Weekly XP", "Streaks", and "All-Time"
2. WHEN the user selects the "Weekly XP" tab, THE Leaderboard_Page SHALL display the Weekly_XP_Board
3. WHEN the user selects the "Streaks" tab, THE Leaderboard_Page SHALL display the Streak_Board
4. WHEN the user selects the "All-Time" tab, THE Leaderboard_Page SHALL display the AllTime_XP_Board
5. THE Leaderboard_Page SHALL default to the "Weekly XP" tab on initial load
6. THE Leaderboard_Page SHALL highlight the current user's row in each leaderboard view
7. EACH leaderboard view SHALL display rank position, user display name, and the relevant metric (weekly XP, streak days, or total XP)
8. THE Leaderboard_Page SHALL be accessible from the Sidebar navigation

### Requirement 15: Leaderboard Pagination and Performance

**User Story:** As a learner, I want the leaderboard to load quickly even with many users, so that the experience remains smooth.

#### Acceptance Criteria

1. THE Leaderboard_Service SHALL return leaderboard results in pages of 50 entries
2. THE Leaderboard_Page SHALL display pagination controls (next page, previous page) when more than 50 entries exist
3. THE Leaderboard_Service SHALL cache leaderboard results and refresh the cache at a configurable interval (default: 5 minutes)
4. WHEN the cache is stale, THE Leaderboard_Service SHALL recompute rankings from XP_Transaction data
5. THE Leaderboard_Page SHALL display the current user's rank and stats at the top of the leaderboard regardless of which page is being viewed

### Requirement 16: XP Transaction Persistence and Integrity

**User Story:** As a developer, I want XP transactions stored reliably, so that XP totals are always accurate and auditable.

#### Acceptance Criteria

1. THE XP_Service SHALL persist each XP_Transaction with: userId, source type, base amount, multiplier, final amount, reference identifier (nodeId, skillMapId, etc.), and timestamp
2. THE XP_Service SHALL ensure that the sum of all XP_Transaction final amounts for a user equals the user's total XP (invariant property)
3. IF an XP_Transaction fails to persist, THEN THE XP_Service SHALL retry once and log the failure without blocking the triggering action
4. THE XP_Service SHALL validate that base amount is a positive integer and multiplier is either 1 or 2 before persisting an XP_Transaction
5. FOR ALL users, recalculating total XP from XP_Transactions SHALL produce the same value as the stored total XP (consistency invariant)

### Requirement 17: Loading and Error States

**User Story:** As a learner, I want clear feedback when leaderboard data is loading or unavailable, so that I understand the current state of the interface.

#### Acceptance Criteria

1. WHILE the Leaderboard_Page is loading data, THE Leaderboard_Page SHALL display a loading skeleton
2. IF the Leaderboard_Service fails to return data, THEN THE Leaderboard_Page SHALL display an error message with a retry option
3. WHILE the XP_Profile is loading, THE XP_Profile SHALL display placeholder content
4. IF the XP_Profile fails to load, THEN THE XP_Profile SHALL display a fallback state showing "XP data unavailable" with a retry option
