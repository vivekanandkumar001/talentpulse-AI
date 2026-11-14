'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layers,
  Database,
  Cpu,
  Server,
  HardDrive,
  Plus,
  Trash2,
  Smartphone,
  Cloud,
  Move,
  Share2,
  Check,
  X,
  Edit2,
  Sparkles,
  RotateCcw,
  Link as LinkIcon
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export type NodeType = 'service' | 'database' | 'kafka' | 'redis' | 'balancer' | 'client' | 'gateway';

export interface WhiteboardNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
}

export interface WhiteboardConnection {
  id: string;
  fromId: string;
  toId: string;
}

interface ArchitectureWhiteboardPaneProps {
  sessionId?: string;
  onGraphUpdate?: (nodes: WhiteboardNode[], connections: WhiteboardConnection[]) => void;
  onAttachToAnswer?: (architectureSummary: string) => void;
  onSpeakCritique?: (text: string) => void;
}

const SAMPLE_NODES: WhiteboardNode[] = [
  { id: 'node-client', type: 'client', label: 'Client (Web / Mobile)', x: 40, y: 130 },
  { id: 'node-alb', type: 'balancer', label: 'AWS ALB / Gateway', x: 230, y: 130 },
  { id: 'node-api', type: 'service', label: 'Core API Service', x: 430, y: 70 },
  { id: 'node-redis', type: 'redis', label: 'Redis Cache Cluster', x: 640, y: 70 },
  { id: 'node-kafka', type: 'kafka', label: 'Kafka Event Stream', x: 430, y: 210 },
  { id: 'node-db', type: 'database', label: 'MongoDB Primary DB', x: 640, y: 210 }
];

const SAMPLE_CONNECTIONS: WhiteboardConnection[] = [
  { id: 'c-1', fromId: 'node-client', toId: 'node-alb' },
  { id: 'c-2', fromId: 'node-alb', toId: 'node-api' },
  { id: 'c-3', fromId: 'node-api', toId: 'node-redis' },
  { id: 'c-4', fromId: 'node-alb', toId: 'node-kafka' },
  { id: 'c-5', fromId: 'node-kafka', toId: 'node-db' }
];

export const ArchitectureWhiteboardPane: React.FC<ArchitectureWhiteboardPaneProps> = ({
  sessionId,
  onGraphUpdate,
  onAttachToAnswer,
  onSpeakCritique,
}) => {
  // Start with clean initial state for examination, with sample template readily accessible
  const [nodes, setNodes] = useState<WhiteboardNode[]>(SAMPLE_NODES);
  const [connections, setConnections] = useState<WhiteboardConnection[]>(SAMPLE_CONNECTIONS);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [critiqueResult, setCritiqueResult] = useState<{
    strengths?: string[];
    bottlenecks?: string[];
    socratic_question?: string;
    interviewer_line?: string;
  } | null>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Connect mode state
  const [isConnectMode, setIsConnectMode] = useState<boolean>(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  // Custom node modal / inline creation state
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customLabel, setCustomLabel] = useState<string>('');
  const [customType, setCustomType] = useState<NodeType>('service');

  // Inline editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');

  // Status message notification
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Notify parent of updates
  const notifyUpdate = useCallback((newNodes: WhiteboardNode[], newConns: WhiteboardConnection[]) => {
    onGraphUpdate?.(newNodes, newConns);
  }, [onGraphUpdate]);

  // ----------------------------------------------------
  // DRAG & DROP LOGIC
  // ----------------------------------------------------
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    // If in connect mode, handle connection rather than drag
    if (isConnectMode) {
      handleNodeConnectClick(nodeId);
      return;
    }

    // Don't drag if clicking buttons or input inside the node
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const canvasRect = canvas.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - canvasRect.left - node.x,
      y: e.clientY - canvasRect.top - node.y
    };

    setDraggingId(nodeId);
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const rawX = e.clientX - canvasRect.left - dragOffsetRef.current.x;
      const rawY = e.clientY - canvasRect.top - dragOffsetRef.current.y;

      // Restrict within canvas area with padding
      const nodeWidth = 190;
      const nodeHeight = 65;
      const maxX = Math.max(20, canvasRect.width - nodeWidth);
      const maxY = Math.max(20, canvasRect.height - nodeHeight);

      const boundedX = Math.round(Math.max(15, Math.min(maxX, rawX)));
      const boundedY = Math.round(Math.max(15, Math.min(maxY, rawY)));

      setNodes((prev) => {
        const next = prev.map((n) => (n.id === draggingId ? { ...n, x: boundedX, y: boundedY } : n));
        return next;
      });
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      notifyUpdate(nodes, connections);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, nodes, connections, notifyUpdate]);

  // ----------------------------------------------------
  // ADD / REMOVE / EDIT NODES
  // ----------------------------------------------------
  const addNode = (type: NodeType, label?: string) => {
    const defaultLabels: Record<NodeType, string> = {
      service: 'Microservice API',
      database: 'Database Cluster',
      kafka: 'Event Queue / Stream',
      redis: 'Redis In-Memory Cache',
      balancer: 'Load Balancer / ALB',
      client: 'Client App (Web/Mobile)',
      gateway: 'API Gateway / CDN'
    };

    const canvas = canvasRef.current;
    const canvasWidth = canvas?.clientWidth || 800;
    const canvasHeight = canvas?.clientHeight || 450;

    // Stagger new nodes so they don't land directly on top of each other
    const count = nodes.length;
    const newX = Math.min(canvasWidth - 220, 60 + ((count * 60) % (canvasWidth - 260)));
    const newY = Math.min(canvasHeight - 90, 80 + ((count * 45) % (canvasHeight - 120)));

    const newNode: WhiteboardNode = {
      id: 'node-' + Date.now().toString(36),
      type,
      label: label?.trim() || defaultLabels[type],
      x: newX,
      y: newY
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    notifyUpdate(nextNodes, connections);
    showStatus(`Added: ${newNode.label}`);
  };

  const handleCreateCustomNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;
    addNode(customType, customLabel.trim());
    setCustomLabel('');
    setShowCustomModal(false);
  };

  const deleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextConns = connections.filter((c) => c.fromId !== nodeId && c.toId !== nodeId);
    setNodes(nextNodes);
    setConnections(nextConns);
    if (connectSourceId === nodeId) setConnectSourceId(null);
    notifyUpdate(nextNodes, nextConns);
    showStatus('Component removed');
  };

  const startEditNode = (node: WhiteboardNode) => {
    setEditingNodeId(node.id);
    setEditingLabel(node.label);
  };

  const saveEditNode = (nodeId: string) => {
    if (!editingLabel.trim()) {
      setEditingNodeId(null);
      return;
    }
    const nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, label: editingLabel.trim() } : n));
    setNodes(nextNodes);
    setEditingNodeId(null);
    notifyUpdate(nextNodes, connections);
  };

  // ----------------------------------------------------
  // CONNECTION LINKING LOGIC
  // ----------------------------------------------------
  const handleNodeConnectClick = (nodeId: string) => {
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      const sourceNode = nodes.find((n) => n.id === nodeId);
      showStatus(`Source: "${sourceNode?.label}". Now click destination component.`);
    } else {
      if (connectSourceId === nodeId) {
        setConnectSourceId(null);
        showStatus('Connection cancelled.');
        return;
      }

      // Check if connection already exists
      const exists = connections.some(
        (c) => (c.fromId === connectSourceId && c.toId === nodeId) || (c.fromId === nodeId && c.toId === connectSourceId)
      );

      if (exists) {
        showStatus('Connection already exists between these components.');
        setConnectSourceId(null);
        return;
      }

      const newConn: WhiteboardConnection = {
        id: `c-${Date.now()}`,
        fromId: connectSourceId,
        toId: nodeId
      };

      const nextConns = [...connections, newConn];
      setConnections(nextConns);
      setConnectSourceId(null);
      setIsConnectMode(false);
      notifyUpdate(nodes, nextConns);
      showStatus('Connection arrow created!');
    }
  };

  const removeConnection = (connId: string) => {
    const nextConns = connections.filter((c) => c.id !== connId);
    setConnections(nextConns);
    notifyUpdate(nodes, nextConns);
    showStatus('Connection removed');
  };

  const clearCanvas = () => {
    setNodes([]);
    setConnections([]);
    setConnectSourceId(null);
    setIsConnectMode(false);
    notifyUpdate([], []);
    showStatus('Whiteboard cleared for clean examination design');
  };

  const loadSampleTemplate = () => {
    setNodes(SAMPLE_NODES);
    setConnections(SAMPLE_CONNECTIONS);
    setConnectSourceId(null);
    setIsConnectMode(false);
    notifyUpdate(SAMPLE_NODES, SAMPLE_CONNECTIONS);
    showStatus('Sample 3-tier architecture loaded');
  };

  // ----------------------------------------------------
  // ATTACH TO ANSWER
  // ----------------------------------------------------
  const handleAttachToAnswer = () => {
    if (nodes.length === 0) {
      showStatus('Whiteboard is empty. Add components first.');
      return;
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const lines: string[] = [];
    lines.push('### 📐 System Architecture Design');
    lines.push('');
    lines.push('**Components:**');
    nodes.forEach((n) => {
      lines.push(`- **${n.label}** (${n.type.toUpperCase()})`);
    });

    if (connections.length > 0) {
      lines.push('');
      lines.push('**Data Flow & Topology:**');
      connections.forEach((c) => {
        const fromNode = nodeMap.get(c.fromId);
        const toNode = nodeMap.get(c.toId);
        if (fromNode && toNode) {
          lines.push(`- \`${fromNode.label}\` ➔ \`${toNode.label}\``);
        }
      });
    }

    const summaryText = lines.join('\n');
    if (onAttachToAnswer) {
      onAttachToAnswer(summaryText);
      showStatus('Architecture diagram attached to your response!');
    } else {
      navigator.clipboard?.writeText(summaryText);
      showStatus('Architecture copied to clipboard!');
    }
  };

  const generateArchitectureSummary = useCallback((): string => {
    if (nodes.length === 0) return '';
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const lines: string[] = [];
    lines.push('### 📐 System Architecture Design');
    lines.push('');
    lines.push('**Components:**');
    nodes.forEach((n) => {
      lines.push(`- **${n.label}** (${n.type.toUpperCase()})`);
    });
    if (connections.length > 0) {
      lines.push('');
      lines.push('**Data Flow & Topology:**');
      connections.forEach((c) => {
        const fromNode = nodeMap.get(c.fromId);
        const toNode = nodeMap.get(c.toId);
        if (fromNode && toNode) {
          lines.push(`- \`${fromNode.label}\` ➔ \`${toNode.label}\``);
        }
      });
    }
    return lines.join('\n');
  }, [nodes, connections]);

  const handleCritiqueArchitecture = async () => {
    if (!sessionId) {
      showStatus('System design critique active during live interview session.');
      return;
    }
    if (nodes.length === 0) {
      showStatus('Whiteboard is empty. Add components to critique.');
      return;
    }
    setIsCritiquing(true);
    setCritiqueResult(null);
    try {
      const summary = generateArchitectureSummary();
      const res = await apiFetch(`/api/interview/${sessionId}/whiteboard/critique`, {
        method: 'POST',
        body: JSON.stringify({
          nodes,
          connections,
          summary,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCritiqueResult(data);
        if (data.interviewer_line && onSpeakCritique) {
          onSpeakCritique(data.interviewer_line);
        }
        showStatus('Sarah Chen analyzed your architecture topology.');
      }
    } catch (err) {
      console.warn('[Critique Error]', err);
      showStatus('Critique temporarily unavailable.');
    } finally {
      setIsCritiquing(false);
    }
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'client':
        return <Smartphone className="w-4 h-4 text-accent-cyan shrink-0" />;
      case 'balancer':
        return <Cpu className="w-4 h-4 text-accent-indigo shrink-0" />;
      case 'redis':
        return <HardDrive className="w-4 h-4 text-accent-amber shrink-0" />;
      case 'kafka':
        return <Layers className="w-4 h-4 text-accent-violet shrink-0" />;
      case 'database':
        return <Database className="w-4 h-4 text-accent-emerald shrink-0" />;
      case 'gateway':
        return <Cloud className="w-4 h-4 text-sky-400 shrink-0" />;
      default:
        return <Server className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-inset rounded-2xl border border-line overflow-hidden shadow-2xl select-none">
      {/* WHITEBOARD PALETTE TOOLBAR */}
      <div className="p-3 bg-surface border-b border-line flex items-center justify-between flex-wrap gap-2.5">
        {/* ADD COMPONENT PRIMITIVES */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-ink-muted mr-1 font-semibold">Add Primitive:</span>

          <button
            type="button"
            onClick={() => addNode('service')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line hover:border-blue-500/40 text-ink hover:text-blue-400 text-xs transition-colors cursor-pointer"
            title="Add Microservice Backend"
          >
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Service</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('database')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line hover:border-emerald-500/40 text-ink hover:text-accent-emerald text-xs transition-colors cursor-pointer"
            title="Add Database"
          >
            <Database className="w-3.5 h-3.5 text-accent-emerald" />
            <span>Database</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('redis')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line hover:border-amber-500/40 text-ink hover:text-accent-amber text-xs transition-colors cursor-pointer"
            title="Add Cache Cluster"
          >
            <HardDrive className="w-3.5 h-3.5 text-accent-amber" />
            <span>Redis Cache</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('kafka')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line hover:border-purple-500/40 text-ink hover:text-accent-violet text-xs transition-colors cursor-pointer"
            title="Add Message Queue"
          >
            <Layers className="w-3.5 h-3.5 text-accent-violet" />
            <span>Queue / Stream</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('balancer')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line hover:border-indigo-500/40 text-ink hover:text-accent-indigo text-xs transition-colors cursor-pointer"
            title="Add Load Balancer"
          >
            <Cpu className="w-3.5 h-3.5 text-accent-indigo" />
            <span>Load Balancer</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('client')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line hover:border-cyan-500/40 text-ink hover:text-accent-cyan text-xs transition-colors cursor-pointer"
            title="Add Client App"
          >
            <Smartphone className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Client</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-accent-cyan text-xs font-medium transition-colors cursor-pointer"
            title="Add custom named node"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Node</span>
          </button>
        </div>

        {/* TOOLBAR CONTROLS & ACTIONS */}
        <div className="flex items-center gap-2">
          {/* CONNECT ARROWS TOGGLE */}
          <button
            type="button"
            onClick={() => {
              setIsConnectMode(!isConnectMode);
              setConnectSourceId(null);
              if (!isConnectMode) {
                showStatus('Connect Mode active: Click 1st component, then click 2nd to link with arrow.');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isConnectMode
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-lg shadow-cyan-500/30'
                : 'bg-inset hover:bg-surface-elevated text-ink border-line hover:text-accent-cyan'
            }`}
            title="Click components sequentially to draw connector arrows"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{isConnectMode ? 'Connecting... (Cancel)' : 'Connect Nodes'}</span>
          </button>

          {/* TEMPLATE & CLEAR */}
          <button
            type="button"
            onClick={loadSampleTemplate}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-surface-elevated border border-line text-ink-muted hover:text-ink text-xs transition-colors cursor-pointer"
            title="Load sample 3-tier microservice architecture"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Template</span>
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-inset hover:bg-rose-500/10 border border-line hover:border-rose-500/30 text-accent-rose text-xs transition-colors cursor-pointer"
            title="Clear canvas to start clean"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          {/* ATTACH TO ANSWER */}
          <button
            type="button"
            onClick={handleAttachToAnswer}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-accent-emerald text-xs font-semibold transition-colors cursor-pointer"
            title="Export architecture topology and attach to candidate answer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Attach to Answer</span>
          </button>

          {/* CRITIQUE ARCHITECTURE WITH SARAH */}
          <button
            type="button"
            onClick={handleCritiqueArchitecture}
            disabled={isCritiquing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-accent-cyan text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/10"
            title="Ask Sarah Chen to analyze bottlenecks and SPOFs in your system design"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCritiquing ? 'animate-spin' : 'animate-pulse'}`} />
            <span>{isCritiquing ? 'Analyzing Architecture...' : 'Critique Architecture'}</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION STATUS TOAST */}
      {statusMessage && (
        <div className="bg-cyan-500/10 border-b border-cyan-500/30 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-accent-cyan animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-accent-cyan hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* CUSTOM NODE CREATION MODAL OVERLAY */}
      {showCustomModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomNode}
            className="bg-surface border border-line-strong rounded-2xl p-5 shadow-2xl max-w-sm w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent-cyan" />
                <span>Add Custom Architecture Component</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-ink-muted mb-1">Component Name / Service:</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Auth Service, Stripe Webhook, Qdrant DB"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-inset border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-ink-muted mb-1">Component Category:</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as NodeType)}
                  className="w-full px-3 py-2 rounded-xl bg-inset border border-line text-sm text-ink font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="service">Microservice (Backend App)</option>
                  <option value="database">Database (SQL / NoSQL / Vector)</option>
                  <option value="redis">In-Memory Cache (Redis / Memcached)</option>
                  <option value="kafka">Message Queue (Kafka / RabbitMQ / SQS)</option>
                  <option value="balancer">Load Balancer / Nginx / ALB</option>
                  <option value="gateway">API Gateway / CDN / Cloudflare</option>
                  <option value="client">Client App (Web / Mobile / IoT)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 rounded-lg bg-inset border border-line text-xs text-ink hover:bg-surface-2 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-accent-cyan text-on-brand text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
              >
                Add to Canvas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SVG INTERACTIVE GRAPH CANVAS */}
      <div
        ref={canvasRef}
        className="relative flex-1 bg-[radial-gradient(rgba(100,116,139,0.25)_1.2px,transparent_1.2px)] [background-size:20px_20px] min-h-[380px] p-4 overflow-hidden"
      >
        {/* SVG CONNECTOR LINES & ARROWS */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker
              id="whiteboard-arrow"
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path
                d="M 1.5 1.5 L 6 4 L 1.5 6.5 z"
                className="fill-sky-600 "
              />
            </marker>
          </defs>

          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.fromId);
            const toNode = nodes.find((n) => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            // Dimensions of nodes
            const nodeW = 185;
            const nodeH = 65;

            const fromCenterX = fromNode.x + nodeW / 2;
            const fromCenterY = fromNode.y + nodeH / 2;
            const toCenterX = toNode.x + nodeW / 2;
            const toCenterY = toNode.y + nodeH / 2;

            // Determine best anchor sides
            const dx = toCenterX - fromCenterX;
            const dy = toCenterY - fromCenterY;

            let startX = fromCenterX;
            let startY = fromCenterY;
            let endX = toCenterX;
            let endY = toCenterY;

            const isHorizontal = Math.abs(dx) >= Math.abs(dy);
            const gap = 5; // Clean breathing room so arrow tip points neatly at card border

            if (isHorizontal) {
              if (dx > 0) {
                startX = fromNode.x + nodeW;
                endX = toNode.x - gap;
              } else {
                startX = fromNode.x;
                endX = toNode.x + nodeW + gap;
              }
            } else {
              if (dy > 0) {
                startY = fromNode.y + nodeH;
                endY = toNode.y - gap;
              } else {
                startY = fromNode.y;
                endY = toNode.y + nodeH + gap;
              }
            }

            // Smooth S-curve control points (gold standard diagramming bezier)
            const c1x = isHorizontal ? startX + (endX - startX) * 0.5 : startX;
            const c1y = isHorizontal ? startY : startY + (endY - startY) * 0.5;
            const c2x = isHorizontal ? endX - (endX - startX) * 0.5 : endX;
            const c2y = isHorizontal ? endY : endY - (endY - startY) * 0.5;
            const pathD = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            return (
              <g key={conn.id} className="pointer-events-auto group">
                {/* 1. Sleek, razor-sharp high-contrast wire (thin 1.75px for clean modern look) */}
                <path
                  d={pathD}
                  stroke="currentColor"
                  strokeWidth="1.75"
                  fill="none"
                  strokeLinecap="round"
                  markerEnd="url(#whiteboard-arrow)"
                  className="text-sky-600  group-hover:text-sky-700  transition-colors"
                />

                {/* 2. Delicate origin pin dot */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="2.5"
                  className="fill-sky-600 "
                />

                {/* 3. Subtle hover hotspot for instant disconnect */}
                <g
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => removeConnection(conn.id)}
                >
                  <circle
                    cx={midX}
                    cy={midY}
                    r="7.5"
                    className="fill-rose-500 stroke-white  stroke-[1.5] shadow-md"
                  />
                  <line
                    x1={midX - 2.5}
                    y1={midY - 2.5}
                    x2={midX + 2.5}
                    y2={midY + 2.5}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1={midX + 2.5}
                    y1={midY - 2.5}
                    x2={midX - 2.5}
                    y2={midY + 2.5}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <title>Click to disconnect wire</title>
                </g>
              </g>
            );
          })}
        </svg>

        {/* NODES MATRIX */}
        {nodes.map((node) => {
          const isDragging = draggingId === node.id;
          const isConnectSource = connectSourceId === node.id;
          const isEditing = editingNodeId === node.id;

          return (
            <div
              key={node.id}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                touchAction: 'none'
              }}
              onMouseDown={(e) => handleMouseDownNode(e, node.id)}
              className={`absolute w-[185px] p-2.5 rounded-xl bg-surface/95 border backdrop-blur-md shadow-lg transition-shadow group ${
                isDragging
                  ? 'border-accent-cyan shadow-cyan-500/30 scale-105 z-40 cursor-grabbing'
                  : isConnectSource
                  ? 'border-cyan-400 ring-2 ring-cyan-400 ring-offset-2 ring-offset-black z-30 cursor-pointer animate-pulse'
                  : isConnectMode
                  ? 'border-cyan-500/60 hover:border-cyan-400 cursor-pointer hover:shadow-cyan-500/20 z-20'
                  : 'border-line-strong hover:border-cyan-500/60 cursor-grab z-10'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1 rounded-lg bg-inset border border-line">
                    {getNodeIcon(node.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingLabel}
                          autoFocus
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditNode(node.id);
                            if (e.key === 'Escape') setEditingNodeId(null);
                          }}
                          className="w-full text-xs bg-inset border border-cyan-400 rounded px-1 py-0.5 text-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => saveEditNode(node.id)}
                          className="text-accent-emerald hover:opacity-75 transition-opacity cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p
                          onDoubleClick={() => startEditNode(node)}
                          className="text-xs font-semibold text-ink truncate cursor-text"
                          title="Double-click to rename"
                        >
                          {node.label}
                        </p>
                        <p className="text-[10px] font-mono text-ink-muted capitalize">
                          {node.type}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* NODE ACTIONS (EDIT & DELETE) */}
                {!isConnectMode && !isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditNode(node)}
                      className="p-1 rounded hover:bg-inset text-ink-muted hover:text-accent-cyan cursor-pointer"
                      title="Rename component"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNode(node.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-ink-muted hover:text-accent-rose cursor-pointer"
                      title="Remove component"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* DRAG HANDLE INDICATOR */}
              <div className="mt-1.5 pt-1 border-t border-line/40 flex items-center justify-between text-[9px] font-mono text-ink-faint">
                <span className="flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" />
                  <span>Drag to move</span>
                </span>
                {isConnectMode ? (
                  <span className="text-accent-cyan font-bold">
                    {isConnectSource ? 'Source' : 'Click to link'}
                  </span>
                ) : (
                  <span>Double-click edit</span>
                )}
              </div>
            </div>
          );
        })}

        {/* EMPTY STATE HELPER */}
        {nodes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-accent-cyan shadow-xl">
              <Move className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Whiteboard Canvas Ready</p>
              <p className="text-xs text-ink-muted max-w-sm mt-1">
                Add architecture primitives from the toolbar above to design your system. Drag components anywhere on the canvas and link them with arrows.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={loadSampleTemplate}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-line text-xs font-mono text-ink hover:text-accent-cyan transition-colors cursor-pointer"
              >
                Load Starter Template
              </button>
              <button
                type="button"
                onClick={() => addNode('client')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-xs font-mono text-accent-cyan transition-colors cursor-pointer"
              >
                + Add Client App
              </button>
            </div>
          </div>
        )}
      </div>

      {/* REAL-TIME ARCHITECTURAL CRITIQUE CARD */}
      {critiqueResult && (
        <div className="bg-[#091122] border-t border-cyan-500/30 p-3.5 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white tracking-tight">Sarah Chen&apos;s Architectural Critique</span>
            </div>
            <button
              type="button"
              onClick={() => setCritiqueResult(null)}
              className="text-slate-400 hover:text-slate-100 text-xs p-1 rounded hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
              <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Architectural Strengths
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-200/90">
                {critiqueResult.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-300">
              <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                <Trash2 className="w-3 h-3 text-amber-400" /> Bottlenecks &amp; SPOFs
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
                {critiqueResult.bottlenecks?.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
          {critiqueResult.socratic_question && (
            <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
              <span className="font-semibold text-cyan-400">Socratic Challenge: </span>
              <span>{critiqueResult.socratic_question}</span>
            </div>
          )}
        </div>
      )}

      {/* FOOTER BAR HELPER */}
      <div className="px-4 py-2 bg-surface border-t border-line flex items-center justify-between text-[11px] font-mono text-ink-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Components: <strong>{nodes.length}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Connections: <strong>{connections.length}</strong></span>
          </span>
        </div>
        <span className="text-ink-faint hidden sm:inline">
          Tip: Click &quot;Connect Nodes&quot; to link components with directional flow arrows.
        </span>
      </div>
    </div>
  );
};
