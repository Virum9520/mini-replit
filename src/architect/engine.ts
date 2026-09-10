// The "AI Deploy Advisor" — a deterministic heuristics engine that analyzes
// the workspace and a set of requirements, then recommends an AWS
// architecture. No LLM, no API keys: every recommendation is explainable,
// reproducible, and runs entirely in the browser.

export interface Requirements {
  /** Expected steady-state requests per second. */
  rps: number
  database: boolean
  realtime: boolean
  global: boolean
  budget: 'hobby' | 'startup' | 'enterprise'
}

export const DEFAULT_REQUIREMENTS: Requirements = {
  rps: 10,
  database: false,
  realtime: false,
  global: false,
  budget: 'startup',
}

export interface WorkspaceAnalysis {
  languages: string[]
  serverish: boolean
  fileCount: number
  totalBytes: number
  signals: string[]
}

export type ArchTier = 'static' | 'serverless' | 'containers'

export interface ArchComponent {
  id: string
  name: string
  why: string
  cost: string
}

export interface Architecture {
  tier: ArchTier
  title: string
  components: ArchComponent[]
  costTier: string
  reasoning: string[]
}

const SERVER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bfrom\s+flask\b|\bimport\s+flask\b/i, label: 'Flask app detected' },
  { pattern: /\bfrom\s+fastapi\b|\bimport\s+fastapi\b/i, label: 'FastAPI app detected' },
  { pattern: /\bimport\s+django\b|\bfrom\s+django\b/i, label: 'Django app detected' },
  { pattern: /require\(['"]express['"]\)|from\s+['"]express['"]/, label: 'Express server detected' },
  { pattern: /http\.createServer|new\s+WebSocketServer/, label: 'Node HTTP/WebSocket server detected' },
  { pattern: /\bapp\.listen\s*\(/, label: 'Server listen() call detected' },
  { pattern: /\bimport\s+socket\b|\bimport\s+asyncio\b/, label: 'Python socket/async networking detected' },
]

export function analyzeWorkspace(files: Record<string, string>): WorkspaceAnalysis {
  const names = Object.keys(files)
  const signals: string[] = []
  const langs = new Set<string>()
  let serverish = false
  let totalBytes = 0

  for (const [name, content] of Object.entries(files)) {
    totalBytes += content.length
    if (name.endsWith('.py')) langs.add('Python')
    else if (name.endsWith('.js') || name.endsWith('.ts')) langs.add('JavaScript')
    else if (name.endsWith('.html')) langs.add('HTML')
    else if (name.endsWith('.css')) langs.add('CSS')

    for (const { pattern, label } of SERVER_PATTERNS) {
      if (pattern.test(content)) {
        serverish = true
        if (!signals.includes(`${label} in ${name}`)) {
          signals.push(`${label} in ${name}`)
        }
      }
    }
  }

  const kb = (totalBytes / 1024).toFixed(1)
  signals.unshift(
    `Scanned ${names.length} file${names.length === 1 ? '' : 's'} (${kb} KB): ${
      [...langs].join(' + ') || 'empty workspace'
    }`,
  )
  if (!serverish) {
    signals.push('No server framework found — code runs client-side / as scripts')
  }

  return {
    languages: [...langs],
    serverish,
    fileCount: names.length,
    totalBytes,
    signals,
  }
}

function pick(
  id: string,
  name: string,
  why: string,
  cost: string,
): ArchComponent {
  return { id, name, why, cost }
}

export function recommend(
  analysis: WorkspaceAnalysis,
  req: Requirements,
): Architecture {
  const reasoning: string[] = [...analysis.signals]
  const components: ArchComponent[] = []

  const needsBackend = analysis.serverish || req.database || req.realtime
  const highTraffic = req.rps >= 500
  const budgetCapsContainers = req.budget === 'hobby'

  let tier: ArchTier
  if (!needsBackend && !highTraffic) {
    tier = 'static'
    reasoning.push(
      `At ~${req.rps} RPS with no backend needs, a static site is the cheapest, fastest option — no servers to patch, scale, or pay for while idle.`,
    )
  } else if (!highTraffic || budgetCapsContainers) {
    tier = 'serverless'
    if (budgetCapsContainers && highTraffic) {
      reasoning.push(
        `Traffic (~${req.rps} RPS) would normally justify containers, but the hobby budget caps us at serverless — Lambda scales to zero when idle so you only pay per request.`,
      )
    } else {
      reasoning.push(
        `~${req.rps} RPS is comfortably inside Lambda territory. Serverless means zero idle cost and automatic scaling with no capacity planning.`,
      )
    }
  } else {
    tier = 'containers'
    reasoning.push(
      `At ~${req.rps} RPS sustained, per-request Lambda pricing crosses over — always-on containers with autoscaling are cheaper and give you steady p99 latency.`,
    )
  }

  // ---- Edge / networking ----
  if (req.global) {
    components.push(
      pick(
        'route53',
        'Route 53',
        'Latency-based DNS routing sends each user to the nearest healthy endpoint.',
        '~$1/mo + queries',
      ),
      pick(
        'cloudfront',
        'CloudFront CDN',
        'Global users: 400+ edge locations cache content close to every visitor, cutting latency worldwide.',
        '$1–20/mo',
      ),
    )
    reasoning.push(
      'Global audience enabled — adding Route 53 latency routing and CloudFront edge caching in front of everything.',
    )
  } else if (tier === 'static') {
    components.push(
      pick(
        'cloudfront',
        'CloudFront CDN',
        'Serves the site over HTTPS from edge caches; S3 alone has no free HTTPS on custom domains.',
        '$0–5/mo',
      ),
    )
  }

  // ---- Compute / origin ----
  if (tier === 'static') {
    components.push(
      pick(
        's3',
        'S3 (static hosting)',
        'Your build output is just files — S3 stores and serves them with 11 nines of durability for pennies.',
        '<$1/mo',
      ),
    )
  } else if (tier === 'serverless') {
    components.push(
      pick(
        'apigw',
        req.realtime ? 'API Gateway (WebSocket)' : 'API Gateway',
        req.realtime
          ? 'Managed WebSocket connections — realtime without running a single connection server.'
          : 'Managed HTTPS front door: routing, throttling, and auth without maintaining servers.',
        '$1–15/mo',
      ),
      pick(
        'lambda',
        'Lambda',
        'Functions scale from zero to thousands of concurrent executions automatically; you pay per millisecond used.',
        '$0–25/mo',
      ),
    )
    if (req.database) {
      components.push(
        pick(
          'dynamodb',
          'DynamoDB',
          'Serverless database to match: single-digit-ms reads, on-demand pricing, no connection pools to exhaust from Lambda.',
          '$1–25/mo',
        ),
      )
      reasoning.push(
        'Database requirement + Lambda pairs best with DynamoDB — no connection limits, scales on demand.',
      )
    }
  } else {
    components.push(
      pick(
        'alb',
        'Application Load Balancer',
        req.realtime
          ? 'Spreads traffic across containers and natively supports long-lived WebSocket connections.'
          : 'Spreads traffic across containers across multiple availability zones.',
        '~$20/mo',
      ),
      pick(
        'ecs',
        'ECS Fargate (autoscaling)',
        'Containers without managing EC2: tasks autoscale on CPU/requests, deployed multi-AZ for resilience.',
        '$70–300/mo',
      ),
    )
    if (req.database) {
      components.push(
        pick(
          'rds',
          'RDS (Multi-AZ)',
          'Relational data with automatic failover to a standby in a second availability zone.',
          '$60–200/mo',
        ),
      )
    }
    components.push(
      pick(
        'elasticache',
        'ElastiCache (Redis)',
        'At this traffic level, caching hot reads shields the database and keeps p99 latency flat.',
        '$25–100/mo',
      ),
    )
    if (req.global) {
      components.push(
        pick(
          'region2',
          'Second region (replica)',
          'Multi-region active-passive: Route 53 health checks fail traffic over if the primary region degrades.',
          '≈2× compute cost',
        ),
      )
      reasoning.push(
        'Global + high traffic: recommending a warm standby in a second region behind Route 53 health checks.',
      )
    }
  }

  if (req.realtime && tier !== 'containers') {
    reasoning.push(
      'Realtime/WebSockets requirement — using API Gateway WebSocket APIs so no connection servers are needed.',
    )
  }

  // ---- Cost tier ----
  let costTier: string
  if (tier === 'static') {
    costTier = req.global ? '$2–25 / month' : '$1–5 / month'
  } else if (tier === 'serverless') {
    costTier =
      req.rps >= 100 ? '$25–120 / month' : req.database ? '$5–50 / month' : '$2–40 / month'
  } else {
    const base = req.database ? '$180–650 / month' : '$120–450 / month'
    costTier = req.global ? `${base} ×2 regions` : base
  }

  const titles: Record<ArchTier, string> = {
    static: 'Static site — S3 + CloudFront',
    serverless: 'Serverless API — API Gateway + Lambda',
    containers: 'High-traffic — ALB + ECS Fargate (Multi-AZ)',
  }

  reasoning.push(`Estimated cost tier: ${costTier}.`)

  return { tier, title: titles[tier], components, costTier, reasoning }
}
