# Feature 2: Dashboard — Implementation Guide

## Overview
This document provides detailed implementation guidance for Feature 2 (Dashboard) of the AI-powered collaboration platform MVP.

## Architecture

```
Startup agents/
├── src/
│   ├── app.js                    # Express app entry point
│   └── routes/
│       ├── dashboard.js          # Dashboard API routes
│       └── dashboard.test.js     # Backend tests
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── test/
│       │   └── setup.js
│       ├── hooks/
│       │   ├── useDashboard.js
│       │   └── useDashboard.test.js
│       └── components/
│           └── dashboard/
│               ├── Dashboard.jsx
│               ├── Dashboard.test.jsx
│               ├── StatsCard.jsx
│               ├── StatsCard.test.jsx
│               ├── ActivityFeed.jsx
│               ├── ActivityFeed.test.jsx
│               ├── AIInsightsPanel.jsx
│               ├── AIInsightsPanel.test.jsx
│               ├── ProjectsList.jsx
│               └── ProjectsList.test.jsx
├── package.json                  # Backend package.json
└── SPRINT_1_PLAN.md
```

## Backend API Contract

### GET /api/dashboard/stats
```json
{
  "totalProjects": 12,
  "activeCollaborators": 48,
  "aiInsightsGenerated": 234,
  "tasksCompleted": 89,
  "weeklyGrowth": {
    "projects": 2,
    "collaborators": 5,
    "insights": 34,
    "tasks": 12
  }
}
```

### GET /api/dashboard/projects
```json
{
  "projects": [
    {
      "id": "proj_1",
      "name": "Q4 Strategy Deck",
      "status": "active",
      "collaborators": 5,
      "lastActivity": "2026-08-12T10:30:00Z",
      "aiInsightsCount": 12,
      "description": "Strategic planning deck for Q4 2026"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 10
}
```

### GET /api/dashboard/activity
```json
{
  "activities": [
    {
      "id": "act_1",
      "type": "document_created",
      "user": { "name": "Alice Chen", "avatar": "AC" },
      "action": "created document",
      "target": "Market Analysis Report",
      "timestamp": "2026-08-12T11:00:00Z"
    }
  ]
}
```

### GET /api/dashboard/insights
```json
{
  "insights": [
    {
      "id": "ins_1",
      "title": "Collaboration Surge Detected",
      "description": "Team activity increased 34% this week. Peak hours: 10am-2pm.",
      "type": "collaboration",
      "priority": "high",
      "createdAt": "2026-08-12T09:00:00Z"
    }
  ]
}
```

## Frontend Component Specs

### Dashboard Layout
```
┌─────────────────────────────────────────┐
│  Header: "Good morning, [User]" + Bell  │
├──────┬──────┬──────┬──────────────────-─┤
│Stats │Stats │Stats │Stats               │
├──────┴──────┴──────┴────────────────────┤
│  Activity Feed  │  AI Insights Panel    │
│  (left 60%)     │  (right 40%)          │
├─────────────────┴───────────────────────┤
│  Projects List (full width)             │
└─────────────────────────────────────────┘
```

### Color System (Tailwind)
- Primary: `blue-600` / `indigo-600`
- Success: `green-500`
- Warning: `amber-500`
- Danger: `red-500`
- Background: `gray-50`
- Card background: `white`
- Text primary: `gray-900`
- Text secondary: `gray-500`

### Status Badge Colors
- `active` → `bg-green-100 text-green-700`
- `paused` → `bg-amber-100 text-amber-700`
- `completed` → `bg-blue-100 text-blue-700`

### Priority Badge Colors (AI Insights)
- `high` → `bg-red-100 text-red-700`
- `medium` → `bg-amber-100 text-amber-700`
- `low` → `bg-gray-100 text-gray-600`

## Testing Strategy

### Backend Tests (Vitest + supertest)
- Happy path: each endpoint returns 200 + correct shape
- POST /projects: validates required fields
- Error handling: 400 for missing required fields

### Frontend Tests (Vitest + RTL)
- Component renders without crashing
- Loading states display correctly
- Data displays correctly after mock fetch resolves
- Error states display user-friendly messages
- useDashboard hook: loading → data → error transitions

### Coverage Target: 70%+

## Running the Project

```bash
# Backend
npm install
npm run dev   # starts on port 3001

# Frontend
cd frontend
npm install
npm run dev   # starts on port 5173

# Tests
npm test              # backend tests
cd frontend && npm test  # frontend tests
```
