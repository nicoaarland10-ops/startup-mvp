import { Router } from 'express'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// ── Static mock data ──────────────────────────────────────────────────────────

const USERS = [
  { id: 'usr_001', name: 'Alice Chen',     avatar: 'https://i.pravatar.cc/40?img=1' },
  { id: 'usr_002', name: 'Bob Ramirez',    avatar: 'https://i.pravatar.cc/40?img=2' },
  { id: 'usr_003', name: 'Clara Müller',   avatar: 'https://i.pravatar.cc/40?img=3' },
  { id: 'usr_004', name: 'David Okafor',   avatar: 'https://i.pravatar.cc/40?img=4' },
  { id: 'usr_005', name: 'Elena Sokolova', avatar: 'https://i.pravatar.cc/40?img=5' },
]

// Mutable in-memory project store — seeded with realistic AI project examples
let projects = [
  {
    id: 'proj_001',
    name: 'LLM Prompt Optimisation',
    description: 'Systematic evaluation and refinement of prompt templates across GPT-4o and Claude models.',
    status: 'active',
    collaborators: [USERS[0], USERS[1], USERS[2]],
    lastActivity: '2026-08-12T09:14:00Z',
    aiInsightsCount: 24,
    createdAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'proj_002',
    name: 'RAG Knowledge Base',
    description: "Retrieval-augmented generation pipeline over the company's internal documentation corpus.",
    status: 'active',
    collaborators: [USERS[1], USERS[3]],
    lastActivity: '2026-08-11T16:30:00Z',
    aiInsightsCount: 18,
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'proj_003',
    name: 'Multimodal Vision Agent',
    description: 'Autonomous agent that interprets UI screenshots and generates actionable test scripts.',
    status: 'in_review',
    collaborators: [USERS[0], USERS[4]],
    lastActivity: '2026-08-10T11:00:00Z',
    aiInsightsCount: 9,
    createdAt: '2026-07-01T09:00:00Z',
  },
  {
    id: 'proj_004',
    name: 'Fine-Tuning Pipeline',
    description: 'Automated supervised fine-tuning workflow using human-preference data collected via the platform.',
    status: 'completed',
    collaborators: [USERS[2], USERS[3], USERS[4]],
    lastActivity: '2026-07-28T14:45:00Z',
    aiInsightsCount: 31,
    createdAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'proj_005',
    name: 'AI Safety Red-Teaming',
    description: 'Structured adversarial testing of internal models to surface misalignment and jailbreak vectors.',
    status: 'active',
    collaborators: [USERS[0], USERS[1], USERS[3], USERS[4]],
    lastActivity: '2026-08-12T07:55:00Z',
    aiInsightsCount: 42,
    createdAt: '2026-07-15T08:00:00Z',
  },
]

const ACTIVITY_FEED = [
  {
    id: 'act_001',
    type: 'document_created',
    user: USERS[0],
    action: 'created a document',
    target: 'Prompt Engineering Guidelines v2',
    projectId: 'proj_001',
    timestamp: '2026-08-12T09:14:00Z',
  },
  {
    id: 'act_002',
    type: 'ai_analysis_run',
    user: USERS[1],
    action: 'ran AI analysis',
    target: 'Semantic chunking strategy comparison',
    projectId: 'proj_002',
    timestamp: '2026-08-12T08:47:00Z',
  },
  {
    id: 'act_003',
    type: 'insight_generated',
    user: USERS[4],
    action: 'generated an AI insight',
    target: 'Collaboration bottleneck detected in review cycle',
    projectId: 'proj_005',
    timestamp: '2026-08-12T07:55:00Z',
  },
  {
    id: 'act_004',
    type: 'comment_added',
    user: USERS[2],
    action: 'commented on',
    target: 'Fine-tuning loss curve analysis',
    projectId: 'proj_004',
    timestamp: '2026-08-11T17:20:00Z',
  },
  {
    id: 'act_005',
    type: 'task_completed',
    user: USERS[3],
    action: 'completed the task',
    target: 'Implement re-ranking with cross-encoder',
    projectId: 'proj_002',
    timestamp: '2026-08-11T16:30:00Z',
  },
  {
    id: 'act_006',
    type: 'member_invited',
    user: USERS[0],
    action: 'invited',
    target: 'elena.sokolova@company.ai to AI Safety Red-Teaming',
    projectId: 'proj_005',
    timestamp: '2026-08-11T14:10:00Z',
  },
  {
    id: 'act_007',
    type: 'model_deployed',
    user: USERS[1],
    action: 'deployed model checkpoint',
    target: 'ft-gpt4o-v3-checkpoint-2800',
    projectId: 'proj_004',
    timestamp: '2026-08-11T12:00:00Z',
  },
  {
    id: 'act_008',
    type: 'document_updated',
    user: USERS[4],
    action: 'updated the document',
    target: 'Red-Teaming Playbook – Attack Vectors',
    projectId: 'proj_005',
    timestamp: '2026-08-10T15:45:00Z',
  },
]

// Type → suggested next steps. Shown on the insight detail page so an insight
// always ships with something actionable, not just a diagnosis.
const RECOMMENDED_ACTIONS = {
  collaboration: [
    'Redistribute reviewer load across the team',
    'Set a 24-hour review SLA for open pull requests',
    'Add a second reviewer rotation for high-traffic files',
  ],
  performance: [
    'Switch the production template to the winning variant',
    'Roll out behind a feature flag and monitor hallucination rate',
    'Archive the losing variant to keep the prompt library clean',
  ],
  productivity: [
    'Schedule a recurring sync during the identified peak window',
    'Share the finding with team leads for calendar planning',
  ],
  data_quality: [
    'Augment the dataset with multilingual pairs before the next run',
    'Flag the affected training run for re-evaluation',
    'Add a language-balance check to the data pipeline',
  ],
  quality: [
    'Prioritise the 12 suggested test scenarios in the next sprint',
    'Add coverage gates for low-contrast and dark-mode cases',
  ],
  security: [
    'Prioritise mitigations for the tool-use attack category',
    'Escalate to the security review channel',
    'Re-run the red-team suite after mitigations ship',
  ],
}

let INSIGHTS = [
  {
    id: 'ins_001',
    title: 'Review Cycle Bottleneck Detected',
    description: 'Pull-request review latency on the RAG Knowledge Base project has increased by 38% over the last two weeks. Three reviewers account for 80% of unreviewed items. Consider redistributing the reviewer load or setting a 24-hour SLA.',
    type: 'collaboration',
    priority: 'high',
    status: 'active',
    projectId: 'proj_002',
    assignee: null,
    createdAt: '2026-08-12T07:55:00Z',
    updatedAt: '2026-08-12T07:55:00Z',
  },
  {
    id: 'ins_002',
    title: 'Prompt Template A/B Results Ready',
    description: 'Chain-of-thought prompts outperform direct-answer prompts by 14.2% on the internal reasoning benchmark (n = 1,200). Switching the production template is estimated to reduce hallucination rate from 6.1% to 3.8%.',
    type: 'performance',
    priority: 'high',
    status: 'active',
    projectId: 'proj_001',
    assignee: null,
    createdAt: '2026-08-11T18:00:00Z',
    updatedAt: '2026-08-11T18:00:00Z',
  },
  {
    id: 'ins_003',
    title: 'Optimal Team Collaboration Window Identified',
    description: 'Commit and comment activity peaks between 09:00–11:30 UTC across all five active collaborators. Scheduling synchronous sessions in this window could reduce async back-and-forth by an estimated 25%.',
    type: 'productivity',
    priority: 'medium',
    status: 'active',
    projectId: null,
    assignee: null,
    createdAt: '2026-08-11T12:00:00Z',
    updatedAt: '2026-08-11T12:00:00Z',
  },
  {
    id: 'ins_004',
    title: 'Fine-Tuning Dataset Bias Warning',
    description: 'Preference data collected in weeks 3–4 shows a 2.3× over-representation of English-language examples. Non-English task performance may degrade post fine-tune. Recommend augmenting with multilingual pairs before next training run.',
    type: 'data_quality',
    priority: 'high',
    status: 'active',
    projectId: 'proj_004',
    assignee: null,
    createdAt: '2026-08-10T10:30:00Z',
    updatedAt: '2026-08-10T10:30:00Z',
  },
  {
    id: 'ins_005',
    title: 'Vision Agent Test Coverage Gap',
    description: 'The Multimodal Vision Agent currently has 41% automated test coverage on UI parsing logic. Edge cases around low-contrast and dark-mode screenshots are untested. 12 suggested test scenarios are attached.',
    type: 'quality',
    priority: 'medium',
    status: 'active',
    projectId: 'proj_003',
    assignee: null,
    createdAt: '2026-08-09T09:15:00Z',
    updatedAt: '2026-08-09T09:15:00Z',
  },
  {
    id: 'ins_006',
    title: 'Red-Teaming Attack Surface Growing',
    description: 'Seven new jailbreak vectors were logged this week, a 75% increase over the previous period. The tool-use attack category is the fastest-growing segment. Recommend prioritising mitigations in the next sprint.',
    type: 'security',
    priority: 'critical',
    status: 'active',
    projectId: 'proj_005',
    assignee: null,
    createdAt: '2026-08-08T14:00:00Z',
    updatedAt: '2026-08-08T14:00:00Z',
  },
]

const NOTIFICATIONS = [
  {
    id: 'notif_001',
    type: 'mention',
    read: false,
    title: 'Bob Ramirez mentioned you in "Semantic chunking strategy comparison".',
    link: '/projects/proj_002/discussions/42',
    createdAt: '2026-08-12T08:50:00Z',
  },
  {
    id: 'notif_002',
    type: 'insight',
    read: false,
    title: 'New critical insight: Red-Teaming Attack Surface Growing.',
    link: '/insights/ins_006',
    createdAt: '2026-08-12T07:55:00Z',
  },
  {
    id: 'notif_003',
    type: 'task_assigned',
    read: false,
    title: 'Clara Müller assigned you to "Evaluate multilingual prompt coverage".',
    link: '/projects/proj_001/tasks/88',
    createdAt: '2026-08-11T15:30:00Z',
  },
  {
    id: 'notif_004',
    type: 'project_update',
    read: true,
    title: 'Fine-Tuning Pipeline has been marked as completed.',
    link: '/projects/proj_004',
    createdAt: '2026-08-11T14:45:00Z',
  },
  {
    id: 'notif_005',
    type: 'comment',
    read: true,
    title: 'David Okafor replied to your comment on "Implement re-ranking with cross-encoder".',
    link: '/projects/proj_002/tasks/55',
    createdAt: '2026-08-11T13:20:00Z',
  },
]

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', wrap((_req, res) => {
  const activeCollaborators = new Set(
    projects
      .filter((p) => p.status === 'active')
      .flatMap((p) => p.collaborators.map((c) => c.id)),
  ).size

  res.json({
    data: {
      totalProjects: projects.length,
      activeCollaborators,
      aiInsightsGenerated: projects.reduce((sum, p) => sum + p.aiInsightsCount, 0),
      tasksCompleted: 147,
      recentActivity: ACTIVITY_FEED.slice(0, 5),
    },
  })
}))

/**
 * GET /api/dashboard/projects?page=1&limit=10&status=active
 */
router.get('/projects', wrap((req, res) => {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '10', 10)))
  const { status } = req.query

  let filtered = projects
  if (status) {
    const allowed = ['active', 'in_review', 'completed', 'archived']
    if (!allowed.includes(status)) {
      throw new AppError(
        `Invalid status filter. Allowed values: ${allowed.join(', ')}.`,
        400,
        'INVALID_QUERY_PARAM',
      )
    }
    filtered = projects.filter((p) => p.status === status)
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const items = filtered.slice(offset, offset + limit)

  res.json({
    data: items,
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  })
}))

/**
 * POST /api/dashboard/projects
 */
router.post('/projects', wrap((req, res) => {
  const { name, description } = req.body ?? {}

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Field "name" is required and must be a non-empty string.', 400, 'VALIDATION_ERROR')
  }
  if (name.trim().length > 120) {
    throw new AppError('Field "name" must not exceed 120 characters.', 400, 'VALIDATION_ERROR')
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new AppError('Field "description" must be a string when provided.', 400, 'VALIDATION_ERROR')
  }

  const newProject = {
    id: `proj_${String(projects.length + 1).padStart(3, '0')}`,
    name: name.trim(),
    description: description?.trim() ?? '',
    status: 'active',
    collaborators: [],
    lastActivity: new Date().toISOString(),
    aiInsightsCount: 0,
    createdAt: new Date().toISOString(),
  }

  projects.push(newProject)
  res.status(201).json({ data: newProject })
}))

/**
 * GET /api/dashboard/activity?limit=20
 */
router.get('/activity', wrap((req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
  res.json({ data: ACTIVITY_FEED.slice(0, limit), total: ACTIVITY_FEED.length })
}))

/**
 * GET /api/dashboard/insights?priority=high&type=collaboration&status=active
 */
router.get('/insights', wrap((req, res) => {
  const { priority, type, status } = req.query

  let filtered = INSIGHTS

  if (priority) {
    const allowed = ['low', 'medium', 'high', 'critical']
    if (!allowed.includes(priority)) {
      throw new AppError(
        `Invalid priority filter. Allowed values: ${allowed.join(', ')}.`,
        400,
        'INVALID_QUERY_PARAM',
      )
    }
    filtered = filtered.filter((i) => i.priority === priority)
  }

  if (type) {
    filtered = filtered.filter((i) => i.type === type)
  }

  if (status) {
    const allowed = ['active', 'snoozed', 'resolved', 'archived']
    if (!allowed.includes(status)) {
      throw new AppError(
        `Invalid status filter. Allowed values: ${allowed.join(', ')}.`,
        400,
        'INVALID_QUERY_PARAM',
      )
    }
    filtered = filtered.filter((i) => i.status === status)
  }

  res.json({ data: filtered, total: filtered.length })
}))

/**
 * GET /api/dashboard/insights/:id
 */
router.get('/insights/:id', wrap((req, res) => {
  const insight = INSIGHTS.find((i) => i.id === req.params.id)
  if (!insight) {
    throw new AppError('Insight not found.', 404, 'NOT_FOUND')
  }
  const project = projects.find((p) => p.id === insight.projectId) ?? null
  res.json({
    data: {
      ...insight,
      project: project ? { id: project.id, name: project.name } : null,
      recommendedActions: RECOMMENDED_ACTIONS[insight.type] ?? [],
    },
  })
}))

/**
 * PATCH /api/dashboard/insights/:id/action
 * body: { action: 'resolve' | 'snooze' | 'archive' | 'reopen', assignee?: string }
 */
router.patch('/insights/:id/action', wrap((req, res) => {
  const insight = INSIGHTS.find((i) => i.id === req.params.id)
  if (!insight) {
    throw new AppError('Insight not found.', 404, 'NOT_FOUND')
  }

  const { action, assignee } = req.body ?? {}
  const statusByAction = { resolve: 'resolved', snooze: 'snoozed', archive: 'archived', reopen: 'active' }
  if (!action || !statusByAction[action]) {
    throw new AppError(
      `Field "action" must be one of: ${Object.keys(statusByAction).join(', ')}.`,
      400,
      'VALIDATION_ERROR',
    )
  }

  insight.status = statusByAction[action]
  insight.updatedAt = new Date().toISOString()
  if (assignee !== undefined) {
    if (assignee !== null && !USERS.some((u) => u.id === assignee)) {
      throw new AppError('Unknown assignee id.', 400, 'VALIDATION_ERROR')
    }
    insight.assignee = assignee
  }

  res.json({ data: insight })
}))

/**
 * GET /api/dashboard/projects/:id/overview
 */
router.get('/projects/:id/overview', wrap((req, res) => {
  const project = projects.find((p) => p.id === req.params.id)
  if (!project) {
    throw new AppError('Project not found.', 404, 'NOT_FOUND')
  }

  res.json({
    data: {
      project,
      insights: INSIGHTS.filter((i) => i.projectId === project.id),
      activity: ACTIVITY_FEED.filter((a) => a.projectId === project.id),
    },
  })
}))

/**
 * GET /api/dashboard/team
 */
router.get('/team', wrap((_req, res) => {
  const members = USERS.map((user) => {
    const memberProjects = projects.filter((p) => p.collaborators.some((c) => c.id === user.id))
    const openInsights = INSIGHTS.filter(
      (i) => i.status === 'active' && memberProjects.some((p) => p.id === i.projectId),
    ).length
    return {
      ...user,
      projectCount: memberProjects.length,
      projects: memberProjects.map((p) => ({ id: p.id, name: p.name })),
      openInsights,
    }
  })
  res.json({ data: members, total: members.length })
}))

/**
 * GET /api/dashboard/notifications?unreadOnly=true
 */
router.get('/notifications', wrap((req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true'
  const items = unreadOnly ? NOTIFICATIONS.filter((n) => !n.read) : NOTIFICATIONS
  res.json({
    data: items,
    unreadCount: NOTIFICATIONS.filter((n) => !n.read).length,
    total: NOTIFICATIONS.length,
  })
}))

/**
 * PATCH /api/dashboard/notifications/:id/read
 */
router.patch('/notifications/:id/read', wrap((req, res) => {
  const notification = NOTIFICATIONS.find((n) => n.id === req.params.id)
  if (!notification) {
    throw new AppError('Notification not found.', 404, 'NOT_FOUND')
  }
  notification.read = true
  res.json({ data: notification })
}))

/**
 * POST /api/dashboard/notifications/read-all
 */
router.post('/notifications/read-all', wrap((_req, res) => {
  NOTIFICATIONS.forEach((n) => { n.read = true })
  res.json({ data: NOTIFICATIONS })
}))

export default router
