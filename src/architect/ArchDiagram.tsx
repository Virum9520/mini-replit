import type { Architecture } from './engine'
import './ArchDiagram.css'

// AWS category colors, slightly Minecraft-ified.
const NODE_STYLE: Record<string, { fill: string; icon: string }> = {
  users: { fill: '#5d9c3f', icon: '☺' },
  route53: { fill: '#8c4fff', icon: '⬡' },
  cloudfront: { fill: '#8c4fff', icon: '◎' },
  s3: { fill: '#3f8624', icon: '▣' },
  apigw: { fill: '#8c4fff', icon: '⇄' },
  lambda: { fill: '#ed7100', icon: 'λ' },
  dynamodb: { fill: '#c925d1', icon: '◆' },
  alb: { fill: '#8c4fff', icon: '⇶' },
  ecs: { fill: '#ed7100', icon: '▦' },
  rds: { fill: '#c925d1', icon: '⛁' },
  elasticache: { fill: '#c925d1', icon: '⚡' },
  region2: { fill: '#555555', icon: '⧉' },
}

const NODE_LABEL: Record<string, string> = {
  users: 'Users',
  route53: 'Route 53',
  cloudfront: 'CloudFront',
  s3: 'S3',
  apigw: 'API Gateway',
  lambda: 'Lambda',
  dynamodb: 'DynamoDB',
  alb: 'ALB',
  ecs: 'ECS Fargate',
  rds: 'RDS',
  elasticache: 'ElastiCache',
  region2: 'Region B',
}

interface Pos {
  x: number
  y: number
}

type Layout = Record<string, Pos>

// Canvas is 900x460; nodes are 150x54 (top-left coords).
function layoutFor(arch: Architecture, global: boolean): Layout {
  const MID = 203
  const TOP = 60
  const BOT = 346

  if (arch.tier === 'static') {
    return global
      ? {
          users: { x: 20, y: MID },
          route53: { x: 210, y: MID },
          cloudfront: { x: 400, y: MID },
          s3: { x: 590, y: MID },
        }
      : {
          users: { x: 60, y: MID },
          cloudfront: { x: 330, y: MID },
          s3: { x: 600, y: MID },
        }
  }

  if (arch.tier === 'serverless') {
    const base: Layout = global
      ? {
          users: { x: 20, y: MID },
          route53: { x: 200, y: MID },
          cloudfront: { x: 200, y: TOP },
          apigw: { x: 390, y: MID },
          lambda: { x: 580, y: MID },
        }
      : {
          users: { x: 40, y: MID },
          apigw: { x: 300, y: MID },
          lambda: { x: 560, y: MID },
        }
    base.dynamodb = { x: 730, y: BOT }
    return base
  }

  // containers
  const base: Layout = global
    ? {
        users: { x: 10, y: MID },
        route53: { x: 175, y: MID },
        cloudfront: { x: 175, y: TOP },
        alb: { x: 345, y: MID },
        ecs: { x: 515, y: MID },
        rds: { x: 715, y: TOP + 30 },
        elasticache: { x: 715, y: BOT - 30 },
        region2: { x: 515, y: BOT },
      }
    : {
        users: { x: 20, y: MID },
        alb: { x: 250, y: MID },
        ecs: { x: 480, y: MID },
        rds: { x: 700, y: TOP + 30 },
        elasticache: { x: 700, y: BOT - 30 },
      }
  return base
}

function edgesFor(arch: Architecture, global: boolean): Array<[string, string]> {
  const has = (id: string) => arch.components.some((c) => c.id === id)
  const edges: Array<[string, string]> = []

  if (arch.tier === 'static') {
    if (global) edges.push(['users', 'route53'], ['route53', 'cloudfront'])
    else edges.push(['users', 'cloudfront'])
    edges.push(['cloudfront', 's3'])
    return edges
  }

  if (arch.tier === 'serverless') {
    if (global) {
      edges.push(['users', 'route53'], ['route53', 'cloudfront'], ['route53', 'apigw'])
    } else {
      edges.push(['users', 'apigw'])
    }
    edges.push(['apigw', 'lambda'])
    if (has('dynamodb')) edges.push(['lambda', 'dynamodb'])
    return edges
  }

  if (global) {
    edges.push(
      ['users', 'route53'],
      ['route53', 'cloudfront'],
      ['route53', 'alb'],
      ['route53', 'region2'],
    )
  } else {
    edges.push(['users', 'alb'])
  }
  edges.push(['alb', 'ecs'])
  if (has('rds')) edges.push(['ecs', 'rds'])
  if (has('elasticache')) edges.push(['ecs', 'elasticache'])
  return edges
}

const NODE_W = 150
const NODE_H = 54
const ALL_NODE_IDS = Object.keys(NODE_STYLE)

interface ArchDiagramProps {
  arch: Architecture
  global: boolean
}

export default function ArchDiagram({ arch, global }: ArchDiagramProps) {
  const layout = layoutFor(arch, global)
  const visible = new Set(['users', ...arch.components.map((c) => c.id)])
  const edges = edgesFor(arch, global)

  const center = (id: string): Pos => {
    const p = layout[id] ?? { x: 375, y: 203 }
    return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 }
  }

  return (
    <svg
      className="archdiagram"
      viewBox="0 0 900 460"
      role="img"
      aria-label={`AWS architecture: ${arch.title}`}
    >
      {/* Edges */}
      {edges.map(([from, to]) => {
        const a = center(from)
        const b = center(to)
        return (
          <line
            key={`${from}-${to}`}
            className="archdiagram-edge"
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        )
      })}

      {/* Nodes — all mounted so position/opacity morph smoothly */}
      {ALL_NODE_IDS.map((id) => {
        const style = NODE_STYLE[id]
        const pos = layout[id] ?? { x: 375, y: 203 }
        const isVisible = visible.has(id) && layout[id] !== undefined
        const comp = arch.components.find((c) => c.id === id)
        return (
          <g
            key={id}
            className={`archdiagram-node ${isVisible ? 'visible' : ''}`}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
          >
            <rect
              width={NODE_W}
              height={NODE_H}
              fill={style.fill}
              className="archdiagram-node-rect"
            />
            <text x={14} y={34} className="archdiagram-node-icon">
              {style.icon}
            </text>
            <text x={42} y={24} className="archdiagram-node-label">
              {NODE_LABEL[id]}
            </text>
            <text x={42} y={42} className="archdiagram-node-cost">
              {id === 'users' ? 'your players' : comp?.cost ?? ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
