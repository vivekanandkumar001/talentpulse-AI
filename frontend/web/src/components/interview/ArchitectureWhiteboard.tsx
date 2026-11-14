'use client';

import React, { useState } from 'react';
import { Layers, Database, Cpu, Server, HardDrive, Plus, Trash2, Move } from 'lucide-react';

interface DiagramNode {
  id: string;
  type: 'service' | 'database' | 'cache' | 'balancer' | 'queue';
  label: string;
  x: number;
  y: number;
}

export const ArchitectureWhiteboard: React.FC = () => {
  const [nodes, setNodes] = useState<DiagramNode[]>([
    { id: 'node-1', type: 'balancer', label: 'Nginx Load Balancer', x: 60, y: 120 },
    { id: 'node-2', type: 'service', label: 'API Gateway Service', x: 260, y: 120 },
    { id: 'node-3', type: 'cache', label: 'Redis Rate Limiter Cluster', x: 480, y: 60 },
    { id: 'node-4', type: 'database', label: 'MongoDB Core DB', x: 480, y: 180 }
  ]);

  const [selectedNodeType, setSelectedNodeType] = useState<'service' | 'database' | 'cache' | 'balancer' | 'queue'>('service');

  const addNode = () => {
    const labels: Record<string, string> = {
      service: 'Microservice Node',
      database: 'MongoDB Database',
      cache: 'Redis Cache Cluster',
      balancer: 'Load Balancer',
      queue: 'Kafka Message Queue'
    };
    const newNode: DiagramNode = {
      id: 'node-' + Date.now(),
      type: selectedNodeType,
      label: labels[selectedNodeType],
      x: 180 + Math.floor(Math.random() * 200),
      y: 80 + Math.floor(Math.random() * 120)
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const clearNodes = () => {
    setNodes([]);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="w-4 h-4 text-accent-cyan" />;
      case 'cache': return <HardDrive className="w-4 h-4 text-accent-amber" />;
      case 'balancer': return <Cpu className="w-4 h-4 text-accent-indigo" />;
      case 'queue': return <Layers className="w-4 h-4 text-accent-violet" />;
      default: return <Server className="w-4 h-4 text-accent-emerald" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-inset rounded-2xl border border-line overflow-hidden shadow-2xl">
      
      {/* WHITEBOARD TOOLBAR */}
      <div className="p-3 bg-surface border-b border-line flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-ink-muted">Add Architecture Node:</span>
          <select
            value={selectedNodeType}
            onChange={(e) => setSelectedNodeType(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg bg-inset border border-line text-ink text-xs font-mono cursor-pointer"
          >
            <option value="service">Microservice</option>
            <option value="balancer">Load Balancer</option>
            <option value="cache">Redis Cache</option>
            <option value="database">MongoDB Database</option>
            <option value="queue">Kafka Queue</option>
          </select>
          <button
            type="button"
            onClick={addNode}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan text-xs font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Node</span>
          </button>
        </div>

        <button
          type="button"
          onClick={clearNodes}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset border border-line text-accent-rose text-xs font-medium hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Canvas</span>
        </button>
      </div>

      {/* SVG DIAGRAM CANVAS AREA */}
      <div className="relative flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] min-h-[350px] p-6 overflow-auto">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Connector Lines between sequential nodes */}
          {nodes.map((node, i) => {
            if (i === 0) return null;
            const prev = nodes[i - 1];
            return (
              <line
                key={`line-${node.id}`}
                x1={prev.x + 80}
                y1={prev.y + 25}
                x2={node.x + 80}
                y2={node.y + 25}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {/* DRAGGABLE / POSITIONED NODES */}
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{ left: `${node.x}px`, top: `${node.y}px` }}
            className="absolute p-3 rounded-xl bg-surface border border-line-strong shadow-xl backdrop-blur-md flex items-center gap-2.5 cursor-grab hover:border-cyan-400 transition-all group"
          >
            {getNodeIcon(node.type)}
            <div>
              <p className="text-xs font-semibold text-ink">{node.label}</p>
              <p className="text-[10px] font-mono text-ink-muted capitalize">{node.type} node</p>
            </div>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-ink-faint space-y-2">
            <Move className="w-8 h-8 animate-pulse" />
            <p className="text-xs font-mono">Whiteboard Canvas Empty. Click &quot;Add Node&quot; above to draw system architecture.</p>
          </div>
        )}
      </div>

    </div>
  );
};
