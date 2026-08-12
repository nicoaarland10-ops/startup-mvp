# Sprint 1 Plan — AI-Powered Collaboration Platform

## Sprint Overview
**Sprint Duration**: 2 weeks  
**Sprint Goal**: Deliver a functional MVP with authentication, dashboard, and core collaboration features  
**Total Story Points**: 89

---

## Feature 1: Authentication & Onboarding (13 points) ✅ Complete
- User registration and login (JWT)
- OAuth integration (Google)
- Onboarding wizard
- Profile setup

---

## Feature 2: Dashboard (21 points) 🚧 In Progress

### Description
The central hub of the platform. Users land here after login and see an overview of their collaboration activity, AI-generated insights, project statuses, and team activity.

### Backend Requirements
**File**: `src/routes/dashboard.js`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Aggregate stats: projects, collaborators, AI insights, tasks |
| `/api/dashboard/projects` | GET | Paginated project list with metadata |
| `/api/dashboard/activity` | GET | Recent team activity feed |
| `/api/dashboard/insights` | GET | AI-generated insights and recommendations |
| `/api/dashboard/notifications` | GET | User notification feed |
| `/api/dashboard/projects` | POST | Create a new project |

### Frontend Requirements
**Directory**: `frontend/src/`

#### Components
- `Dashboard.jsx` — Main layout container
- `StatsCard.jsx` — Reusable KPI metric card
- `ActivityFeed.jsx` — Real-time team activity list
- `AIInsightsPanel.jsx` — AI recommendation sidebar
- `ProjectsList.jsx` — Project grid/table with status

#### Custom Hooks
- `useDashboard.js` — Data fetching hook for all dashboard data

#### Styling
- Tailwind CSS, responsive (mobile-first)
- Blue/indigo color scheme
- Clean B2B SaaS aesthetic

### Acceptance Criteria
- [ ] All API endpoints return correct data shapes
- [ ] Dashboard renders stats, activity, insights, and projects
- [ ] Responsive layout works on mobile and desktop
- [ ] Loading and error states handled gracefully
- [ ] 70%+ test coverage with Vitest + React Testing Library

### Story Point Breakdown
| Task | Points |
|------|--------|
| Backend API routes | 5 |
| Stats + StatsCard component | 3 |
| Activity Feed component | 4 |
| AI Insights Panel | 4 |
| Projects List component | 3 |
| Tests (backend + frontend) | 2 |

---

## Feature 3: Real-Time Collaboration (34 points) 📋 Planned
- WebSocket integration for live document editing
- Presence indicators (who's online)
- Inline commenting system
- Conflict resolution

---

## Feature 4: AI Integration (21 points) 📋 Planned
- AI-powered document summarization
- Smart task suggestions
- Collaboration pattern analysis
- Natural language search

---

## Technical Standards
- **Backend**: Node.js + Express, ES Modules
- **Frontend**: React 18 + Vite, Tailwind CSS
- **Testing**: Vitest + React Testing Library, 70%+ coverage
- **Code Quality**: ESLint, Prettier
- **Git**: Conventional commits, feature branches

---

## Definition of Done
- [ ] Feature implemented per acceptance criteria
- [ ] Tests written with 70%+ coverage
- [ ] Code reviewed and merged
- [ ] No critical linting errors
- [ ] Responsive on mobile + desktop
