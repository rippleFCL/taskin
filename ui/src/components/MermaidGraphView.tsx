import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { api } from '../api';
import { DependencyGraph } from '../types';
import { Card } from './ui/card';
import { RefreshCw } from 'lucide-react';
import svgPanZoom from 'svg-pan-zoom';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

function esc(label: string) {
    // Escape quotes for Mermaid labels
    return label.replace(/"/g, '\\"');
}

function nodeIdTodo(id: number) {
    return `todo_${id}`;
}

export default function MermaidGraphView() {
    const [graph, setGraph] = useState<DependencyGraph | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [svg, setSvg] = useState<string>('');
    const panZoomRef = useRef<ReturnType<typeof svgPanZoom> | null>(null);
    const resizeObsRef = useRef<ResizeObserver | null>(null);
    const qualityTimerRef = useRef<number | null>(null);
    const qualityModeRef = useRef<'quality' | 'speed'>('quality');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const g = await api.getDependencyGraph();
            setGraph(g);
        } catch (e: any) {
            setError(e?.message || 'Failed to load dependency graph');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'dark' });
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, []);

    // Build Mermaid code from API data
    const mermaidCode = useMemo(() => {
        if (!graph) return '';
        const lines: string[] = [];
        lines.push('flowchart TD'); // Top -> Down layout

        // Define nodes (todos)
        for (const n of graph.nodes) {
            const nid = nodeIdTodo(n.id);
            const label = esc(n.title);
            lines.push(`${nid}["${label}"]`);
        }

        // Optional special node for all one-offs
        if ((graph.edges || []).some(e => e.dependency_type === 'all_oneoffs')) {
            lines.push(`oneoffs_all(("All One-offs"))`);
            // style distinct color
            lines.push('classDef oneoffs fill:#f59e0b,stroke:#111,color:#111');
            lines.push('class oneoffs_all oneoffs;');
        }

        // Edges: prerequisite --> dependent
        for (const e of graph.edges) {
            const depId = nodeIdTodo(e.from_todo_id); // dependent
            if (e.dependency_type === 'all_oneoffs') {
                lines.push(`oneoffs_all --> ${depId}`);
            } else if (e.to_todo_id != null) {
                const preId = nodeIdTodo(e.to_todo_id);
                lines.push(`${preId} --> ${depId}`);
            }
        }

        // Basic styling for readability
        lines.push('linkStyle default stroke:#cbd5e1,stroke-width:2,opacity:0.85');

        return lines.join('\n');
    }, [graph]);

    useEffect(() => {
        let cancelled = false;
        const render = async () => {
            if (!mermaidCode) { setSvg(''); return; }
            try {
                const id = `mmd-${Date.now()}`;
                const { svg } = await mermaid.render(id, mermaidCode);
                if (!cancelled) setSvg(svg);
            } catch (e) {
                if (!cancelled) setSvg(`<pre style=\"color:#f87171\">${String(e)}</pre>`);
            }
        };
        render();
        return () => { cancelled = true; };
    }, [mermaidCode]);

    // Make the rendered SVG fill the container width and height
    useEffect(() => {
        const host = containerRef.current;
        if (!host) return;
        const svgEl = host.querySelector('svg') as SVGSVGElement | null;
        if (!svgEl) return;
        // Remove fixed dimensions to allow responsive sizing
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.maxWidth = 'none';
        svgEl.style.display = 'block';
        // Preserve aspect ratio while fitting
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // Keep it crisp
        (svgEl.style as any).textRendering = 'optimizeLegibility';
        (svgEl.style as any).shapeRendering = 'geometricPrecision';
        // Ensure browser delegates touch gestures to us when needed
        (svgEl.style as any).touchAction = 'none';
        (svgEl.style as any).userSelect = 'none';
    }, [svg]);

    // Initialize pan/zoom on the rendered SVG
    useEffect(() => {
        const host = containerRef.current;
        if (!host) return;
        const svgEl = host.querySelector('svg') as SVGSVGElement | null;

        // Clean up any previous instance
        if (panZoomRef.current) {
            try { panZoomRef.current.destroy(); } catch { }
            panZoomRef.current = null;
        }
        if (resizeObsRef.current) {
            try { resizeObsRef.current.disconnect(); } catch { }
            resizeObsRef.current = null;
        }

        if (!svgEl) return;

        // Ensure a viewBox exists for proper zooming
        if (!svgEl.getAttribute('viewBox')) {
            const bbox = svgEl.getBBox();
            svgEl.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        }

        // Helper to temporarily lower render quality during interaction
        const setQuality = (mode: 'quality' | 'speed') => {
            if (qualityModeRef.current === mode) return;
            qualityModeRef.current = mode;
            if (mode === 'speed') {
                (svgEl.style as any).textRendering = 'optimizeSpeed';
                (svgEl.style as any).shapeRendering = 'optimizeSpeed';
            } else {
                (svgEl.style as any).textRendering = 'optimizeLegibility';
                (svgEl.style as any).shapeRendering = 'geometricPrecision';
            }
        };
        const bumpQualityCooldown = () => {
            setQuality('speed');
            if (qualityTimerRef.current != null) window.clearTimeout(qualityTimerRef.current);
            qualityTimerRef.current = window.setTimeout(() => setQuality('quality'), 150);
        };

        // Initialize svg-pan-zoom
        const instance = svgPanZoom(svgEl, {
            zoomEnabled: true,
            panEnabled: true,
            controlIconsEnabled: false,
            fit: true,
            center: true,
            minZoom: 0.2,
            maxZoom: 8,
            zoomScaleSensitivity: 0.2,
            dblClickZoomEnabled: true,
            mouseWheelZoomEnabled: true,
            onPan: bumpQualityCooldown,
            onZoom: bumpQualityCooldown,
        });
        panZoomRef.current = instance;

        // Hint GPU acceleration on the internal viewport group
        const viewport = svgEl.querySelector<SVGGElement>('.svg-pan-zoom_viewport');
        if (viewport) {
            (viewport.style as any).willChange = 'transform';
        }

        // React to container resize
        const ro = new ResizeObserver(() => {
            try {
                // Only resize viewport; avoid repeated fit/center during container changes
                instance.resize();
            } catch { }
        });
        ro.observe(host);
        resizeObsRef.current = ro;

        return () => {
            try { instance.destroy(); } catch { }
            try { ro.disconnect(); } catch { }
            panZoomRef.current = null;
            resizeObsRef.current = null;
            if (qualityTimerRef.current != null) {
                window.clearTimeout(qualityTimerRef.current);
                qualityTimerRef.current = null;
            }
        };
    }, [svg]);

    if (loading && !graph) {
        return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading graph…</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3">
                <div className="text-destructive">{error}</div>
                <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-accent">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground p-4 bg-background/60 border-b">
                <span>Nodes: <strong>{graph?.nodes.length ?? 0}</strong></span>
                <span>Edges: <strong>{graph?.edges.length ?? 0}</strong></span>
                <span>One-offs: <strong>{graph?.oneoff_count ?? 0}</strong></span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => panZoomRef.current?.zoomIn()}
                        title="Zoom in"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => panZoomRef.current?.zoomOut()}
                        title="Zoom out"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { panZoomRef.current?.resetZoom(); panZoomRef.current?.fit(); panZoomRef.current?.center(); }}
                        title="Reset view"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
                <button onClick={load} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>
            <Card className="flex-1 w-screen max-w-none relative left-1/2 -translate-x-1/2 rounded-none border-x-0 overflow-hidden">
                <div ref={containerRef} className="w-full h-full p-4">
                    <div className="block w-full h-full" dangerouslySetInnerHTML={{ __html: svg }} />
                </div>
            </Card>
        </div>
    );
}
