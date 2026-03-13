'use client'

import { useEffect, useCallback, useRef, useState, memo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  getBezierPath,
  type Node, type Edge, type EdgeProps,
  Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import { Loader2, GitBranch } from 'lucide-react'
import { getSourceIcon, getStatusColor } from '@/lib/utils'

const CustomEdge = memo(function CustomEdge({
  id, sourceX, sourceY, targetX, targetY, data, markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY })
  const rt = (data as any)?.relationType ?? ''
  const label: string = (data as any)?.sharedTags?.join(', ') ?? ''

  let stroke = '#b1b1b7'
  let strokeWidth = 1.5
  let strokeDasharray = ''

  if (rt === 'theme') {
    stroke = '#cbd5e1'; strokeWidth = 1; strokeDasharray = '4 4'
  } else if (rt === 'theme-overlap') {
    stroke = '#f59e0b'; strokeWidth = 2.5; strokeDasharray = '6 3'
  } else if (rt === 'tag-connection') {
    stroke = '#10b981'; strokeWidth = 2; strokeDasharray = '4 3'
  } else if (rt === 'connection') {
    stroke = '#6366f1'; strokeWidth = 2
  }

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray || undefined}
        opacity={1}
        markerEnd={markerEnd as string | undefined}
      />
      {/* wider invisible path for click target */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      {label && (rt === 'theme-overlap' || rt === 'tag-connection') && (
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle"
            style={{ fontSize: 9, fill: rt === 'theme-overlap' ? '#b45309' : '#065f46', fontWeight: 600 }}>
            {label}
          </textPath>
        </text>
      )}
    </>
  )
})

const edgeTypes = { default: CustomEdge }

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
      className="px-4 py-3 rounded-2xl border-2 text-center font-semibold text-white shadow-lg cursor-pointer select-none hover:opacity-90 transition-opacity"
      style={{ backgroundColor: data.color, borderColor: data.color }}
    >
      <p className="text-sm">{data.label}</p>
      <p className="text-xs opacity-80 mt-1">
        {data.expanded ? '▾' : '▸'} {data.blockCount} {data.blockCount === 1 ? 'item' : 'itens'}
      </p>
    </div>
  )
}

const nodeTypes = { block: BlockNode, theme: ThemeNode }

function applyLayout(rawNodes: any[], rawEdges: any[]) {
  const themeNodes = rawNodes.filter(n => n.type === 'theme')
  const blockNodes = rawNodes.filter(n => n.type === 'block')
  const W = 900
  const themeRadius = 350

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

  const themeMap = new Map(positionedThemes.map(t => [t.id, t.position]))
  const blockThemeEdges = rawEdges.filter(e => e.data?.relationType === 'theme')

  const blockCountPerTheme = new Map<string, number>()
  for (const e of blockThemeEdges)
    blockCountPerTheme.set(e.target, (blockCountPerTheme.get(e.target) ?? 0) + 1)

  const blockIdxPerTheme = new Map<string, number>()
  const positionedBlocks = blockNodes.map(n => {
    const themeEdge = blockThemeEdges.find(e => e.source === n.id)
    if (themeEdge) {
      const themePos = themeMap.get(themeEdge.target) ?? { x: W / 2, y: 400 }
      const count = blockCountPerTheme.get(themeEdge.target) ?? 1
      const idx = blockIdxPerTheme.get(themeEdge.target) ?? 0
      blockIdxPerTheme.set(themeEdge.target, idx + 1)
      const angle = (2 * Math.PI * idx) / count
      const r = 150
      return { ...n, position: { x: themePos.x + r * Math.cos(angle), y: themePos.y + r * Math.sin(angle) } }
    }
    return { ...n, position: { x: W / 2 + (Math.random() - 0.5) * 200, y: 400 + (Math.random() - 0.5) * 200 } }
  })

  return [...positionedThemes, ...positionedBlocks]
}

function rt(e: any): string {
  return e.data?.relationType ?? ''
}

export function KnowledgeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const allNodesRef = useRef<Node[]>([])
  const allEdgesRef = useRef<Edge[]>([])
  const expandedRef = useRef<Set<string>>(new Set())
  const router = useRouter()

  function applyVisibility(expanded: Set<string>) {
    const allNodes = allNodesRef.current
    const allEdges = allEdgesRef.current

    const visibleBlocks = new Set<string>()
    for (const e of allEdges)
      if (rt(e) === 'theme' && expanded.has(e.target as string))
        visibleBlocks.add(e.source as string)

    const nextNodes: Node[] = [
      ...allNodes
        .filter(n => n.type === 'theme')
        .map(n => ({ ...n, data: { ...n.data, expanded: expanded.has(n.id) } })),
      ...allNodes.filter(n => n.type === 'block' && visibleBlocks.has(n.id)),
    ]

    const nextEdges: Edge[] = [
      ...allEdges.filter(e => rt(e) === 'theme-overlap'),
      ...allEdges.filter(e => rt(e) === 'theme' && expanded.has(e.target as string)),
      ...allEdges.filter(e =>
        (rt(e) === 'connection' || rt(e) === 'tag-connection') &&
        visibleBlocks.has(e.source as string) &&
        visibleBlocks.has(e.target as string)
      ),
    ]

    setNodes([...nextNodes])
    setEdges([...nextEdges])
  }

  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.json())
      .then(data => {
        if (!data.nodes) return

        const countMap = new Map<string, number>()
        for (const e of data.edges)
          if (e.data?.relationType === 'theme')
            countMap.set(e.target, (countMap.get(e.target) ?? 0) + 1)

        const positioned = applyLayout(data.nodes, data.edges)

        const rawNodes: Node[] = positioned.map((n: any) => ({
          ...n,
          data: n.type === 'theme'
            ? { ...n.data, blockCount: countMap.get(n.id) ?? 0, expanded: false }
            : n.data,
        }))

        const rawEdges: Edge[] = data.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: e.data,
          // type omitted → uses 'default' → our CustomEdge
        }))

        allNodesRef.current = rawNodes
        allEdgesRef.current = rawEdges

        applyVisibility(new Set())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === 'block') {
      router.push(`/block/${node.id}`)
    } else if (node.type === 'theme') {
      const next = new Set(expandedRef.current)
      next.has(node.id) ? next.delete(node.id) : next.add(node.id)
      expandedRef.current = next
      applyVisibility(next)
    }
  }, [router])

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
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
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
        <div className="space-y-1 text-xs text-slate-400">
          <p>▸ Clique no tema para expandir</p>
          <p>Clique no bloco para abrir</p>
        </div>
        <div className="space-y-1 mt-1 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-indigo-500" /> Tema
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-300" /> Bloco
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-6 h-0.5 bg-indigo-500" /> Conexão explícita
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-6" style={{ borderTop: '2.5px dashed #f59e0b', height: 0 }} /> Temas com tags comuns
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-6" style={{ borderTop: '2px dashed #10b981', height: 0 }} /> Blocos com tags comuns
          </div>
        </div>
      </Panel>
    </ReactFlow>
  )
}
