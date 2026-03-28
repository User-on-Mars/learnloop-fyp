# Bugfix Requirements Document

## Introduction

The skill map loading experience is currently too slow, causing poor user experience when navigating from the library to a skill map screen. The system makes 3 sequential network requests (skill map details → nodes → session counts per node) before rendering any content, resulting in a blank screen or spinner for an extended period. This bugfix addresses the performance bottleneck by implementing parallel data fetching, optimistic UI patterns, caching, and backend optimization.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks on a skill map card in the library THEN the system fetches skill map details, nodes, and session counts sequentially (3 round trips) before rendering

1.2 WHEN the skill map screen is loading THEN the system displays a blank screen or spinner with no visual feedback

1.3 WHEN session data is needed THEN the system makes separate requests per node to fetch session counts and timestamps

1.4 WHEN a user opens a skill map THEN the system loads full session history for all nodes on initial load, increasing payload size

1.5 WHEN a user reopens the same skill map THEN the system re-fetches all data from scratch with no caching

### Expected Behavior (Correct)

2.1 WHEN a user clicks on a skill map card in the library THEN the system SHALL fetch skill map details and nodes in parallel using Promise.all()

2.2  WHEN the skeleton is displayed THEN it SHALL 
always render exactly 5 placeholder node circles regardless 
of actual node count, since count is unknown before data 
loads. WHEN data arrives THEN the skeleton SHALL fade out 
over 150ms before real content renders.

2.3 WHEN session data is needed THEN the system SHALL return sessions_count and last_practiced_at as computed fields within each node response (no separate requests)

2.4 WHEN a user opens a skill map THEN the system SHALL load only sessions_count and last_practiced_at per node initially, deferring full session history until the user opens a specific node's detail panel

2.5 WHEN a user reopens the same skill map within 60 seconds THEN the system SHALL render cached data instantly and re-fetch in the background (stale-while-revalidate)

2.6 WHEN the backend receives a request for skill map data THEN the system SHALL provide a single endpoint GET /api/skill-maps/:id/full that returns skill_map, nodes with session data, and computed progress in one response

2.7 WHEN the /full endpoint request fails THEN the system 
SHALL display an error state with a "Try again" retry button.
The system SHALL NOT display stale cached data without 
clearly marking it as potentially outdated.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views skill map details THEN the system SHALL CONTINUE TO display skill map title, icon, description, goal, and status correctly

3.2 WHEN a user views nodes within a skill map THEN the system SHALL CONTINUE TO display node id, title, position, state, and type correctly

3.3 WHEN a user opens a node's detail panel THEN the system SHALL CONTINUE TO load and display the full session history for that specific node

3.4 WHEN a user makes changes to node state or creates a new session THEN the system SHALL CONTINUE TO persist those changes to the database

3.5  WHEN any of the following write operations 
occur THEN the system SHALL invalidate the cache for that 
skill map: node state change, new session created, session 
completed, node added, node deleted, node edited, skill map 
title/description/goal edited.
3.6 WHEN progress is calculated THEN the system SHALL CONTINUE TO compute completed vs total nodes and percentage correctly
