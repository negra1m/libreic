'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, useNodesState, useEdgesState,
  MarkerType, Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import { Loader2, GitBranch } from 'lucide-react'
import { getSourceIcon, getStatusColor } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  saved:      '#94a3b8',
  pending:    '#f59e0b',
  seen:       '#3b82f6',
  summarized: '#8b5cf6',
  applied:    '#22c55e',
  archived:   '#e2e8f0',
}

function BlockNode({ data }: { data: any }) {
  return (
    <div
      className="px-3 py-2 rounded-xl border-2 bg-white shadow-sm text-center max-w-[160px] cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderColor: data.color ?? '#6366f1' }}
    >
      <div className="text-base mb-0.5">{getSourceIcon(data.sourceType)}</div>
      <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight">{data.label}</p>
      <div className="mt-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(data.status)}`}>
          {data.status}
        </span>
      </div>
    </div>
  )
}

function ThemeNode({ data }: { data: any }) {
  return (
    <div
      className="px-4 py-3 rounded-2xl border-2 text-center font-semibold text-white shadow-lg"
      style={{ backgroundColor: data.color, borderColor: data.color }}
    >
      <p className="text-sm">{data.label}</p>
    </div>
  )
}

const nodeTypes = { block: BlockNode, theme: ThemeNode }

// Layout circular simples para posicionar os nós
function applyLayout(nodes: any[], edges: any[]) {
  const themeNodes = nodes.filter(n => n.type === 'theme')
  const blockNodes = nodes.filter(n => n.type === 'block')

  const W = 900
  const themeRadius = 350

  // Temas em círculo
  const positionedThemes = themeNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / themeNodes.length - Math.PI / 2
    return {
      ...n,
      position: {
        x: W / 2 + themeRadius * Math.cos(angle),
        y: 400 + themeRadius * Math.sin(angle),
      },
    }
  })

  // Blocos ao redor dos temas
  const themeMap = new Map(positionedThemes.map(t => [t.id, t.position]))
  const blockThemeEdges = edges.filter(e => e.type === 'theme')
  const blockPositions = new Map<string, { x: number; y: number }>()

  const blockCountPerTheme = new Map<string, number>()
  for (const e of blockThemeEdges) {
    const key = e.target
    blockCountPerTheme.set(key, (blockCountPerTheme.get(key) ?? 0) + 1)
  }

  const blockIdxPerTheme = new Map<string, number>()

  const positionedBlocks = blockNodes.map(n => {
    const themeEdge = blockThemeEdges.find(e => e.source === n.id)
    if (themeEdge) {
      const themePos = themeMap.get(themeEdge.target) ?? { x: W / 2, y: 400 }
      const count = blockCountPerTheme.get(themeEdge.target) ?? 1
      const idx = blockIdxPerTheme.get(themeEdge.target) ?? 0
      blockIdxPerTheme.set(themeEdge.target, idx + 1)
      const angle = (2 * Math.PI * idx) / count
      const r = 140
      const pos = { x: themePos.x + r * Math.cos(angle), y: themePos.y + r * Math.sin(angle) }
      blockPositions.set(n.id, pos)
      return { ...n, position: pos }
    }
    // Bloco sem tema: posição aleatória no centro
    return { ...n, position: { x: W / 2 + (Math.random() - 0.5) * 200, y: 400 + (Math.random() - 0.5) * 200 } }
  })

  return [...positionedThemes, ...positionedBlocks]
}

export function KnowledgeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [showThemeEdges, setShowThemeEdges] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.json())
      .then(data => {
        const positioned = applyLayout(data.nodes, data.edges)
        setNodes(positioned)
        setEdges(data.edges.map((e: any) => ({
          ...e,
          animated:    e.type === 'connection',
          style:       e.type === 'theme'
            ? { stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }
            : { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd:   e.type === 'connection' ? { type: MarkerType.ArrowClosed, color: '#6366f1' } : undefined,
          hidden:      e.type === 'theme' ? false : false,
        })))
        setLoading(false)
      })
  }, [])

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === 'block') router.push(`/block/${node.id}`)
    if (node.type === 'theme') router.push(`/explore?theme=${node.id.replace('theme_', '')}`)
  }, [router])

  const toggleThemeEdges = () => {
    setShowThemeEdges(v => !v)
    setEdges(prev => prev.map(e => e.type === 'theme' ? { ...e, hidden: showThemeEdges } : e))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-slate-500">Construindo grafo...</span>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      className="bg-slate-50"
    >
      <Background color="#e2e8f0" gap={20} />
      <Controls />
      <MiniMap
        nodeColor={n => (n.data as any)?.color ?? '#6366f1'}
        className="rounded-xl border border-slate-200 shadow-sm"
      />
      <Panel position="top-left" className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <GitBranch className="h-4 w-4 text-indigo-500" />
          Grafo de Conhecimento
        </div>
        <p className="text-xs text-slate-400">Clique em qualquer nó para abrir</p>
        <button
          onClick={toggleThemeEdges}
          className="text-xs text-indigo-600 hover:underline"
        >
          {showThemeEdges ? 'Ocultar' : 'Mostrar'} arestas de tema
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-indigo-500" /> Nós de tema
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-slate-300" /> Blocos de conhecimento
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-6 h-0.5 bg-indigo-500" /> Conexão explícita
          </div>
        </div>
      </Panel>
    </ReactFlow>
  )
}
