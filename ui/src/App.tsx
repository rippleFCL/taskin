import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CategoryWithTodos, TodoWithCategory, TaskStatus, OneOffTodo } from './types';
import { api } from './api';
import { CategoryCard } from './components/CategoryCard';
import { RefreshCw, RotateCcw, ListTodo, Sparkles, Check, Circle, CircleDashed, Moon, Sun, Plus, Trash, Pencil, X, Menu, Network, SkipForward } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './components/ui/collapsible';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from './components/ui/navigation-menu';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Progress } from './components/ui/progress';
import './App.css';
import MermaidGraphView from './components/MermaidGraphView';

function App() {
    const [categories, setCategories] = useState<CategoryWithTodos[]>([]);
    const [recommendedTodos, setRecommendedTodos] = useState<TodoWithCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Once the UI has shown real content in this tab, avoid blocking spinners on future reloads/reconnects
    const [bootstrapped, setBootstrapped] = useState<boolean>(() => {
        try { return sessionStorage.getItem('taskin_bootstrapped') === '1'; } catch { return false; }
    });
    // Routing: derive current tab from URL and keep last tab in storage
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;
    const currentTab: 'all' | 'recommended' | 'oneoff' | 'graph' = path.startsWith('/all')
        ? 'all'
        : path.startsWith('/oneoff')
            ? 'oneoff'
            : path.startsWith('/graph')
                ? 'graph'
                : 'recommended';
    const [error, setError] = useState<string | null>(null);
    const [pendingQueue, setPendingQueue] = useState<Array<{ id: number; status: TaskStatus }>>([]);
    const [oneOffs, setOneOffs] = useState<OneOffTodo[]>([]);
    const [newOneTitle, setNewOneTitle] = useState('');
    const [newOneDesc, setNewOneDesc] = useState('');
    // Inline edit state for One-offs
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [serverOnline, setServerOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSyncing, setIsSyncing] = useState(false);
    const isProcessingRef = useRef(false);
    const footerRef = useRef<HTMLElement | null>(null);
    const [footerHeight, setFooterHeight] = useState<number>(64);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light';
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    });
    const [navOpen, setNavOpen] = useState(false);

    // Summary metrics for All Tasks tab
    const allTodos = useMemo(() => categories.flatMap(c => c.todos), [categories]);
    const summary = useMemo(() => {
        const total = allTodos.length;
        let incomplete = 0, inProgress = 0, complete = 0, skipped = 0;
        for (const t of allTodos) {
            if (t.status === 'incomplete') incomplete++;
            else if (t.status === 'in-progress') inProgress++;
            else if (t.status === 'complete') complete++;
            else if (t.status === 'skipped') skipped++;
        }
        const percentComplete = total > 0 ? Math.round((complete / total) * 100) : 0;
        return {
            total,
            categories: categories.length,
            incomplete,
            inProgress,
            complete,
            skipped,
            percentComplete,
            readyNow: recommendedTodos.length,
        };
    }, [allTodos, categories.length, recommendedTodos.length]);

    // One-offs sorted: in-progress first, then incomplete, then complete, then skipped; stable within groups
    const sortedOneOffs = useMemo(() => {
        const inProgress = oneOffs.filter(o => o.status === 'in-progress');
        const incomplete = oneOffs.filter(o => o.status === 'incomplete');
        const complete = oneOffs.filter(o => o.status === 'complete');
        const skipped = oneOffs.filter(o => o.status === 'skipped');
        return [...inProgress, ...incomplete, ...complete, ...skipped];
    }, [oneOffs]);

    const applyTheme = useCallback((t: 'light' | 'dark') => {
        const root = document.documentElement;
        if (t === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
    }, []);

    // Local storage keys
    const LS_CATEGORIES = 'taskin_categories';
    const LS_RECOMMENDED = 'taskin_recommended';
    const LS_PENDING = 'taskin_pending_queue';
    const LS_ONEOFFS = 'taskin_oneoffs';
    const LS_ONEOFFS_PENDING = 'taskin_oneoffs_pending';

    const saveCache = (cats: CategoryWithTodos[], rec: TodoWithCategory[]) => {
        try {
            localStorage.setItem(LS_CATEGORIES, JSON.stringify(cats));
            localStorage.setItem(LS_RECOMMENDED, JSON.stringify(rec));
        } catch { }
    };

    const savePending = (queue: Array<{ id: number; status: TaskStatus }>) => {
        try {
            localStorage.setItem(LS_PENDING, JSON.stringify(queue));
        } catch { }
    };

    // One-off pending operations queue
    type OneOffOp =
        | { kind: 'create'; clientId: number; title: string; description?: string | null; status?: TaskStatus }
        | { kind: 'status'; id: number; status: TaskStatus }
        | { kind: 'update'; id: number; title?: string; description?: string | null; status?: TaskStatus }
        | { kind: 'delete'; id: number };

    const [oneOffPending, setOneOffPending] = useState<OneOffOp[]>([]);

    const compressOneOffOps = (queue: OneOffOp[]): OneOffOp[] => {
        // Keep only the final intent per item:
        // - For temp (negative) IDs: coalesce into a single 'create' op with merged title/description/status; delete cancels create
        // - For real IDs: keep one combined 'update' (title/desc/status) or 'delete' if present; delete wins
        const createMap = new Map<number, { del?: true; title?: string; description?: string | null; status?: TaskStatus }>(); // key: clientId (negative id)
        const realMap = new Map<number, { del?: true; title?: string; description?: string | null; status?: TaskStatus }>(); // key: id (>0)
        for (const op of queue) {
            if (op.kind === 'create') {
                const cur = createMap.get(op.clientId) || {};
                if (op.title !== undefined) cur.title = op.title;
                if (op.description !== undefined) cur.description = op.description;
                if (op.status !== undefined) cur.status = op.status;
                createMap.set(op.clientId, cur);
                continue;
            }
            const targetId = op.kind === 'status' || op.kind === 'delete' || op.kind === 'update' ? op.id : undefined;
            if (typeof targetId === 'number' && targetId < 0) {
                // Ops against a temp id merge into the create op
                const cur = createMap.get(targetId) || {};
                if (op.kind === 'delete') {
                    createMap.set(targetId, { del: true });
                } else if (op.kind === 'status') {
                    cur.status = op.status;
                    createMap.set(targetId, cur);
                } else if (op.kind === 'update') {
                    if (op.title !== undefined) cur.title = op.title;
                    if (op.description !== undefined) cur.description = op.description;
                    if (op.status !== undefined) cur.status = op.status;
                    createMap.set(targetId, cur);
                }
            } else if (typeof targetId === 'number' && targetId > 0) {
                const cur = realMap.get(targetId) || {};
                if (op.kind === 'delete') {
                    realMap.set(targetId, { del: true });
                } else if (op.kind === 'status') {
                    cur.status = op.status;
                    realMap.set(targetId, cur);
                } else if (op.kind === 'update') {
                    if (op.title !== undefined) cur.title = op.title;
                    if (op.description !== undefined) cur.description = op.description;
                    if (op.status !== undefined) cur.status = op.status;
                    realMap.set(targetId, cur);
                }
            }
        }
        const result: OneOffOp[] = [];
        for (const [clientId, v] of createMap.entries()) {
            if (v.del) continue; // cancelled create
            result.push({ kind: 'create', clientId, title: v.title ?? '', description: v.description, status: v.status });
        }
        for (const [id, v] of realMap.entries()) {
            if (v.del) result.push({ kind: 'delete', id });
            else if (v.title !== undefined || v.description !== undefined || v.status !== undefined) {
                result.push({ kind: 'update', id, title: v.title, description: v.description, status: v.status });
            }
        }
        return result;
    };

    const saveOneOffPending = (queue: OneOffOp[]) => {
        const compact = compressOneOffOps(queue);
        try { localStorage.setItem(LS_ONEOFFS_PENDING, JSON.stringify(compact)); } catch { }
    };

    const loadData = async (initial = false) => {
        if (initial) setIsLoading(true);
        setError(null);
        try {
            const [categoriesData, recommendedData, oneOffData] = await Promise.all([
                api.getCategories(),
                api.getRecommendedTodos(),
                api.getOneOffTodos(),
            ]);
            setCategories(categoriesData);
            setRecommendedTodos(recommendedData);
            setOneOffs(Array.isArray(oneOffData) ? oneOffData : []);
            saveCache(categoriesData, recommendedData);
            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(Array.isArray(oneOffData) ? oneOffData : [])); } catch { }
        } catch (err) {
            if (initial) setError('Failed to load data. Make sure the API is running.');
            console.error(err);
        } finally {
            if (initial) setIsLoading(false);
            // Mark this tab as bootstrapped to prevent full-screen spinner on reconnects
            try { sessionStorage.setItem('taskin_bootstrapped', '1'); } catch { }
            setBootstrapped(true);
        }
    };

    // On first load, if at root path, redirect to last tab or default recommended
    useEffect(() => {
        if (location.pathname === '/') {
            const last = localStorage.getItem('taskin_last_tab');
            const target = (last === 'all' || last === 'oneoff' || last === 'recommended' || last === 'graph') ? last : 'recommended';
            navigate(`/${target}`, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist last tab when route changes
    useEffect(() => {
        try { localStorage.setItem('taskin_last_tab', currentTab); } catch { }
    }, [currentTab]);

    const checkServerHealth = useCallback(async () => {
        if (!navigator.onLine) { setServerOnline(false); return false; }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('/api/health', { signal: controller.signal });
            clearTimeout(timeoutId);
            const ok = res.ok;
            setServerOnline(ok);
            return ok;
        } catch {
            setServerOnline(false);
            return false;
        }
    }, []);

    useEffect(() => {
        // Load from cache first for instant UI
        try {
            const cachedCats = localStorage.getItem(LS_CATEGORIES);
            const cachedRec = localStorage.getItem(LS_RECOMMENDED);
            const cachedPending = localStorage.getItem(LS_PENDING);
            const cachedOneOffs = localStorage.getItem(LS_ONEOFFS);
            const cachedOneOffPending = localStorage.getItem(LS_ONEOFFS_PENDING);
            if (cachedCats && cachedRec) {
                setCategories(JSON.parse(cachedCats));
                setRecommendedTodos(JSON.parse(cachedRec));
                setIsLoading(false);
                try { sessionStorage.setItem('taskin_bootstrapped', '1'); } catch { }
                setBootstrapped(true);
            }
            if (cachedOneOffs) {
                try {
                    const parsed = JSON.parse(cachedOneOffs);
                    setOneOffs(Array.isArray(parsed) ? parsed : []);
                } catch { setOneOffs([]); }
            }
            if (cachedPending) {
                setPendingQueue(JSON.parse(cachedPending));
            }
            if (cachedOneOffPending) {
                try { setOneOffPending(compressOneOffOps(JSON.parse(cachedOneOffPending))); } catch { setOneOffPending([]); }
            }
        } catch { }

        // Initial fetch in background
        loadData(!localStorage.getItem(LS_CATEGORIES));

        const handleOnline = () => { setIsOnline(true); checkServerHealth(); };
        const handleOffline = () => { setIsOnline(false); setServerOnline(false); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkServerHealth]);

    // Initialize/apply theme and watch prefers-color-scheme when user hasn't explicitly chosen
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem('theme', theme);
    }, [theme, applyTheme]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (e: MediaQueryListEvent) => {
            const saved = localStorage.getItem('theme');
            if (saved !== 'light' && saved !== 'dark') {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };
        if (mq.addEventListener) mq.addEventListener('change', listener);
        else mq.addListener(listener as any);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', listener);
            else mq.removeListener(listener as any);
        };
    }, []);

    // Measure footer height to avoid content being hidden under it
    useEffect(() => {
        const measure = () => {
            if (footerRef.current) {
                setFooterHeight(footerRef.current.offsetHeight || 64);
            }
        };
        measure();
        const ro = footerRef.current ? new ResizeObserver(measure) : null;
        if (footerRef.current && ro) ro.observe(footerRef.current);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        return () => {
            if (footerRef.current && ro) ro.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, []);

    const handleReset = async () => {
        if (!confirm('Reset all todos to incomplete? This cannot be undone.')) {
            return;
        }

        // Ensure we have the full set of todos even on initial load
        let snapshotCats = categories;
        if (!snapshotCats || snapshotCats.length === 0) {
            try {
                snapshotCats = await api.getCategories();
                setCategories(snapshotCats);
            } catch (e) {
                console.error('Failed to fetch categories for reset:', e);
                // If we can't fetch, bail to avoid enqueuing an empty set
                return;
            }
        }

        const allIds = snapshotCats.flatMap(c => c.todos.map(t => t.id));

        // Optimistically update all todos locally using the snapshot
        const updatedCats = snapshotCats.map(cat => ({
            ...cat,
            todos: cat.todos.map(t => ({ ...t, status: 'incomplete' as TaskStatus })),
        }));
        setCategories(updatedCats);
        setRecommendedTodos([]);
        saveCache(updatedCats, []);

        // Always queue per-todo updates for background sync (even online)
        const next = compressQueue([
            ...pendingQueue,
            ...allIds.map(id => ({ id, status: 'incomplete' as TaskStatus })),
        ]);
        setPendingQueue(next);
        savePending(next);
        if (navigator.onLine && serverOnline) {
            // Kick off processing now
            processPending();
        }
    };

    const applyLocalStatus = useCallback((id: number, status: TaskStatus) => {
        // Update categories locally
        setCategories(prev => {
            const updated = prev.map(cat => ({
                ...cat,
                todos: cat.todos.map(t => (t.id === id ? { ...t, status } : t)),
            }));
            // Update cache with new categories; recommended we'll handle below
            saveCache(updated, recommendedTodos);
            return updated;
        });

        // Update recommended locally: remove if completed or if not incomplete; conservative update
        setRecommendedTodos(prev => {
            const exists = prev.find(t => t.id === id);
            let next = prev;
            if (exists) {
                // If status changes to not-ready (e.g., complete), remove from list; otherwise update the status badge
                if (status === 'complete') {
                    next = prev.filter(t => t.id !== id);
                } else {
                    next = prev.map(t => (t.id === id ? { ...t, status } : t));
                }
            }
            saveCache(categories, next);
            return next;
        });
    }, [categories, recommendedTodos]);

    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    const compressQueue = (queue: Array<{ id: number; status: TaskStatus }>) => {
        const latest = new Map<number, TaskStatus>();
        for (const item of queue) latest.set(item.id, item.status);
        return Array.from(latest.entries()).map(([id, status]) => ({ id, status }));
    };

    const processPending = useCallback(async () => {
        const canSync = navigator.onLine && serverOnline;
        if (!canSync) return;
        if (isProcessingRef.current) return;
        if (pendingQueue.length === 0 && oneOffPending.length === 0) return;
        isProcessingRef.current = true;
        setIsSyncing(true);
        try {
            // First process main todo status queue
            let work = compressQueue(pendingQueue);
            for (const item of work) {
                if (!(navigator.onLine && serverOnline)) break;
                try {
                    await api.updateTodoStatus(item.id, item.status);
                    // Remove this item from the persisted queue
                    setPendingQueue(prev => {
                        const next = compressQueue(prev).filter(q => q.id !== item.id);
                        savePending(next);
                        return next;
                    });
                } catch {
                    // leave item in queue for retry later
                }
                // Small delay to avoid thundering herd
                await sleep(250);
            }

            // Then process one-off queue (compressed to final intents)
            const workOps = compressOneOffOps(oneOffPending);
            for (const op of workOps) {
                if (!(navigator.onLine && serverOnline)) break;
                try {
                    if (op.kind === 'create') {
                        const created = await api.createOneOffTodo({ title: op.title, description: op.description });
                        if (op.status && op.status !== 'incomplete') {
                            try { await api.updateOneOffTodo(created.id, { status: op.status }); } catch { }
                        }
                        // Replace temp item locally if present
                        setOneOffs(prev => {
                            const exists = prev.some(o => o.id === op.clientId);
                            const list = exists ? prev.map(o => o.id === op.clientId ? created : o) : [created, ...prev];
                            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                            return list;
                        });
                        // Remove op and remap any subsequent queued ops from temp id to real id
                        setOneOffPending(prev => {
                            const remapped = prev.map(x => {
                                if (x.kind === 'status' || x.kind === 'update' || x.kind === 'delete') {
                                    if (x.id === op.clientId) return { ...x, id: created.id } as OneOffOp;
                                }
                                return x;
                            }).filter(x => !(x.kind === 'create' && x.clientId === op.clientId));
                            const compact = compressOneOffOps(remapped);
                            saveOneOffPending(compact);
                            return compact;
                        });
                    } else if (op.kind === 'status') {
                        await api.updateOneOffStatus(op.id, op.status);
                    } else if (op.kind === 'update') {
                        await api.updateOneOffTodo(op.id, { title: op.title, description: op.description, status: op.status });
                    } else if (op.kind === 'delete') {
                        await api.deleteOneOffTodo(op.id);
                    }
                    if (op.kind !== 'create') {
                        setOneOffPending(prev => {
                            const next = prev.filter(x => !((x.kind === op.kind) && (x as any).id === (op as any).id));
                            const compact = compressOneOffOps(next);
                            saveOneOffPending(compact);
                            return compact;
                        });
                    }
                } catch {
                    // leave op for retry
                }
                await sleep(250);
            }
        } finally {
            setIsSyncing(false);
            isProcessingRef.current = false;
            // Soft refresh after syncing
            // Optionally refresh; keep lightweight to avoid flicker
            // loadData(false);
        }
    }, [pendingQueue, oneOffPending, serverOnline]);

    useEffect(() => {
        if (isOnline && serverOnline) {
            processPending();
        }
    }, [isOnline, serverOnline, processPending]);

    // Periodically check server health while there are pending items
    useEffect(() => {
        if (pendingQueue.length === 0 && oneOffPending.length === 0) return;
        let cancelled = false;
        const tick = async () => {
            const ok = await checkServerHealth();
            if (ok && !cancelled) processPending();
        };
        tick();
        const id = setInterval(tick, 5000);
        return () => { cancelled = true; clearInterval(id); };
    }, [pendingQueue.length, oneOffPending.length, checkServerHealth, processPending]);

    // Background refresh: poll the API every 30s without blocking UI
    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            // Only refresh when online and server reachable
            if (navigator.onLine && serverOnline && !cancelled) {
                // Lightweight refresh; do not set loading spinner
                loadData(false);
            }
        };
        // Initial slight delay to avoid clashing with first load
        const first = setTimeout(poll, 5000);
        const interval = setInterval(poll, 30000);
        return () => { cancelled = true; clearTimeout(first); clearInterval(interval); };
    }, [serverOnline]);

    const handleStatusChange = async (id: number, status: TaskStatus) => {
        // Optimistic update locally
        applyLocalStatus(id, status);
        // Attempt to sync immediately if online, else enqueue
        try {
            const canSync = navigator.onLine && serverOnline;
            if (canSync) {
                await api.updateTodoStatus(id, status);
                // Background refresh but don't block UI
                loadData(false);
            } else {
                const next = compressQueue([...pendingQueue, { id, status }]);
                setPendingQueue(next);
                savePending(next);
            }
        } catch (err) {
            // Queue for retry on failure
            const next = compressQueue([...pendingQueue, { id, status }]);
            setPendingQueue(next);
            savePending(next);
            console.error('Queued status update due to error:', err);
        }
    };

    if (isLoading && !bootstrapped) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <button
                        onClick={() => loadData(false)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Choose main layout: full-height/width for Graph, constrained for others
    const mainClasses = currentTab === 'graph'
        ? 'flex-1 w-screen px-0 py-0 overflow-hidden'
        : 'flex-1 container mx-auto px-4 py-6 max-w-4xl overflow-y-auto no-scrollbar';

    return (
        <div className="flex flex-col bg-muted/30" style={{ height: '100svh', overflow: 'hidden' }}>
            <nav className="bg-background border-b">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Mobile header with hamburger */}
                    <div className="flex items-center justify-between py-2 sm:hidden">
                        <button
                            onClick={() => setNavOpen(v => !v)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
                            aria-label="Toggle navigation"
                            aria-expanded={navOpen}
                        >
                            <Menu className="w-4 h-4" />
                            Menu
                        </button>
                        <button
                            onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
                            aria-label="Toggle theme"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    {/* Mobile collapsible nav */}
                    <Collapsible open={navOpen} onOpenChange={setNavOpen} className="sm:hidden">
                        <CollapsibleContent className="pb-2">
                            <div className="grid gap-2">
                                <button
                                    onClick={() => { navigate('/all'); setNavOpen(false); }}
                                    className={`w-full justify-center flex items-center gap-2 px-3 py-3 rounded-md border transition-colors ${currentTab === 'all' ? 'border-primary text-primary' : 'text-foreground hover:bg-accent'} `}
                                >
                                    <ListTodo className="w-4 h-4" />
                                    <span>All</span>
                                </button>
                                <button
                                    onClick={() => { navigate('/recommended'); setNavOpen(false); }}
                                    className={`w-full justify-center flex items-center gap-2 px-3 py-3 rounded-md border transition-colors ${currentTab === 'recommended' ? 'border-primary text-primary' : 'text-foreground hover:bg-accent'} `}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Recommended</span>
                                    <span> ({recommendedTodos.length})</span>
                                </button>
                                <button
                                    onClick={() => { navigate('/oneoff'); setNavOpen(false); }}
                                    className={`w-full justify-center flex items-center gap-2 px-3 py-3 rounded-md border transition-colors ${currentTab === 'oneoff' ? 'border-primary text-primary' : 'text-foreground hover:bg-accent'} `}
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>One-offs</span>
                                    <span> ({oneOffs.length})</span>
                                </button>
                                <button
                                    onClick={() => { navigate('/graph'); setNavOpen(false); }}
                                    className={`w-full justify-center flex items-center gap-2 px-3 py-3 rounded-md border transition-colors ${currentTab === 'graph' ? 'border-primary text-primary' : 'text-foreground hover:bg-accent'} `}
                                >
                                    <Network className="w-4 h-4" />
                                    <span>Graph</span>
                                </button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Desktop/tablet inline nav */}
                    <div className="hidden sm:flex items-center justify-between gap-2 py-2">
                        <NavigationMenu>
                            <NavigationMenuList>
                                <NavigationMenuItem>
                                    <button
                                        onClick={() => navigate('/all')}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${currentTab === 'all' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                                    >
                                        <ListTodo className="w-4 h-4" />
                                        All Tasks
                                    </button>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <button
                                        onClick={() => navigate('/recommended')}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${currentTab === 'recommended' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Recommended ({recommendedTodos.length})
                                    </button>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <button
                                        onClick={() => navigate('/oneoff')}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${currentTab === 'oneoff' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        One-offs ({oneOffs.length})
                                    </button>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <button
                                        onClick={() => navigate('/graph')}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${currentTab === 'graph' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                                    >
                                        <Network className="w-4 h-4" />
                                        Graph
                                    </button>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                        <button
                            onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
                            aria-label="Toggle theme"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main
                className={mainClasses}
                style={currentTab === 'graph' ? {} : { WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingBottom: `${footerHeight}px` }}
            >
                {currentTab === 'all' ? (
                    <>
                        <div className="space-y-4">
                            {/* Summary bar */}
                            <Card className="bg-background/60">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <div className="text-sm text-muted-foreground">
                                            Overview
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {summary.complete}/{summary.total} complete
                                        </div>
                                    </div>
                                    <Progress value={summary.percentComplete} />
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
                                        <div className="rounded-md border p-3 bg-muted/40">
                                            <div className="text-muted-foreground text-xs">Total</div>
                                            <div className="font-medium">{summary.total}</div>
                                        </div>
                                        <div className="rounded-md border p-3 bg-muted/40">
                                            <div className="text-muted-foreground text-xs">Ready now</div>
                                            <div className="font-medium">{summary.readyNow}</div>
                                        </div>
                                        <div className="rounded-md border p-3 bg-muted/40">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="w-3 h-3" /> Complete</div>
                                            <div className="font-medium">{summary.complete}</div>
                                        </div>
                                        <div className="rounded-md border p-3 bg-muted/40">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><CircleDashed className="w-3 h-3" /> In Progress</div>
                                            <div className="font-medium">{summary.inProgress}</div>
                                        </div>
                                        <div className="rounded-md border p-3 bg-muted/40">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Circle className="w-3 h-3" /> Incomplete</div>
                                            <div className="font-medium">{summary.incomplete}</div>
                                        </div>
                                        <div className="rounded-md border p-3 bg-muted/40">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground"><SkipForward className="w-3 h-3" /> Skipped</div>
                                            <div className="font-medium">{summary.skipped}</div>
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>
                            {categories.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No categories found
                                </div>
                            ) : (
                                categories.map(category => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        onStatusChange={handleStatusChange}
                                    />
                                ))
                            )}
                        </div>
                    </>
                ) : currentTab === 'recommended' ? (
                    <div className="bg-background rounded-lg border shadow-sm p-6">
                        <p className="text-sm text-muted-foreground text-center mb-6">
                            Tasks ready to work on (all dependencies satisfied)
                        </p>
                        {recommendedTodos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-2xl mb-2">🎉</p>
                                <p className="font-medium mb-1">No tasks available!</p>
                                <p className="text-sm text-muted-foreground">
                                    Either complete all dependencies or all tasks are done.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recommendedTodos.map(todo => {
                                    const statuses: ('incomplete' | 'in-progress' | 'complete' | 'skipped')[] = ['incomplete', 'in-progress', 'complete', 'skipped'];
                                    return (
                                        <div
                                            key={todo.id}
                                            className="p-4 bg-muted/50 rounded-lg border"
                                        >
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary text-primary-foreground">
                                                    {todo.category.name}
                                                </span>
                                                <h4 className="font-medium flex-1 flex items-center gap-2">
                                                    {todo.title}
                                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-background/40 text-muted-foreground">{todo.status === 'in-progress' ? 'In Progress' : todo.status === 'complete' ? 'Complete' : todo.status === 'skipped' ? 'Skipped' : 'Incomplete'}</span>
                                                </h4>
                                                <div className="ml-2 mt-1">
                                                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: todo.status === 'complete' ? '#22c55e' : todo.status === 'in-progress' ? '#3b82f6' : todo.status === 'skipped' ? '#f97316' : '#64748b' }} title={todo.status} />
                                                </div>
                                            </div>
                                            {todo.description && (
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    {todo.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                {statuses.filter(s => s !== todo.status).map(s => {
                                                    if (s === 'incomplete') {
                                                        return (
                                                            <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => handleStatusChange(todo.id, 'incomplete')} aria-label="Mark as incomplete"><Circle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Incomplete</span></Button>
                                                        );
                                                    }
                                                    if (s === 'in-progress') {
                                                        return (
                                                            <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => handleStatusChange(todo.id, 'in-progress')} aria-label="Mark as in progress"><CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">In Progress</span></Button>
                                                        );
                                                    }
                                                    if (s === 'complete') {
                                                        return (
                                                            <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => handleStatusChange(todo.id, 'complete')} aria-label="Mark as complete"><Check className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Complete</span></Button>
                                                        );
                                                    }
                                                    return (
                                                        <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => handleStatusChange(todo.id, 'skipped')} aria-label="Mark as skipped"><SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Skip</span></Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : currentTab === 'graph' ? (
                    <MermaidGraphView />
                ) : (
                    <div className="bg-background rounded-lg border shadow-sm p-6">
                        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                    className="w-full rounded-md border px-3 py-2 bg-background"
                                    placeholder="Title"
                                    value={newOneTitle}
                                    onChange={e => setNewOneTitle(e.target.value)}
                                />
                                <textarea
                                    className="w-full rounded-md border px-3 py-2 bg-background resize-y min-h-[80px]"
                                    placeholder="Description (optional)"
                                    value={newOneDesc}
                                    onChange={e => setNewOneDesc(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <Button
                                onClick={async () => {
                                    const title = newOneTitle.trim();
                                    if (!title) return;
                                    const description = newOneDesc.trim() || undefined;
                                    const canSync = navigator.onLine && serverOnline;
                                    // Create optimistic local item with a temporary negative ID
                                    const tempId = -Date.now();
                                    const optimistic: OneOffTodo = { id: tempId, title, description: description ?? null, status: 'incomplete' };
                                    setOneOffs(prev => {
                                        const list = [optimistic, ...prev];
                                        try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                        return list;
                                    });
                                    setNewOneTitle(''); setNewOneDesc('');
                                    try {
                                        if (canSync) {
                                            const created = await api.createOneOffTodo({ title, description });
                                            // Replace temp item with real one
                                            setOneOffs(prev => {
                                                const list = prev.map(o => o.id === tempId ? created : o);
                                                try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                return list;
                                            });
                                            // Remap any queued ops from tempId to real id just in case
                                            setOneOffPending(prev => {
                                                const remapped = prev.map(op => {
                                                    if (op.kind === 'status' || op.kind === 'update' || op.kind === 'delete') {
                                                        if (op.id === tempId) return { ...op, id: created.id } as OneOffOp;
                                                    } else if (op.kind === 'create' && op.clientId === tempId) {
                                                        // Drop create for this temp, already created
                                                        return { kind: 'update', id: created.id, title, description } as OneOffOp;
                                                    }
                                                    return op;
                                                }).filter(op => !(op.kind === 'create' && op.clientId === tempId));
                                                const compact = compressOneOffOps(remapped);
                                                saveOneOffPending(compact);
                                                return compact;
                                            });
                                        } else {
                                            // Queue create for later
                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'create' as const, clientId: tempId, title, description, status: 'incomplete' as TaskStatus }]); saveOneOffPending(next); return next; });
                                        }
                                    } catch (e) {
                                        // If online create failed, fall back to queueing the create
                                        setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'create' as const, clientId: tempId, title, description, status: 'incomplete' as TaskStatus }]); saveOneOffPending(next); return next; });
                                    }
                                }}
                                className="flex items-center gap-2"
                                variant="outline"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </Button>
                        </div>
                        {oneOffs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No one-off todos</div>
                        ) : (
                            <div className="space-y-3">
                                {sortedOneOffs.map(item => (
                                    <div key={item.id} className="p-4 bg-muted/50 rounded-lg border">
                                        {/* Header row: title/desc (or inputs) on left, edit/delete on right */}
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1">
                                                {editingId === item.id ? (
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <textarea
                                                            className="w-full rounded-md border px-3 py-2 bg-background resize-y min-h-[60px]"
                                                            placeholder="Title"
                                                            value={editTitle}
                                                            onChange={e => setEditTitle(e.target.value)}
                                                            rows={2}
                                                        />
                                                        <textarea
                                                            className="w-full rounded-md border px-3 py-2 bg-background resize-y min-h-[80px]"
                                                            placeholder="Description (optional)"
                                                            value={editDesc}
                                                            onChange={e => setEditDesc(e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h4 className="font-medium flex items-center gap-2">
                                                            {item.title}
                                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-background/40 text-muted-foreground">{item.status === 'in-progress' ? 'In Progress' : item.status === 'complete' ? 'Complete' : 'Incomplete'}</span>
                                                            <span className="ml-1 inline-block w-2.5 h-2.5 rounded-full" style={{ background: item.status === 'complete' ? '#22c55e' : item.status === 'in-progress' ? '#3b82f6' : '#64748b' }} />
                                                        </h4>
                                                        {item.description && (
                                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {editingId === item.id ? (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center gap-2"
                                                            onClick={async () => {
                                                                const title = editTitle.trim();
                                                                if (!title) { alert('Title is required'); return; }
                                                                const description = editDesc.trim() || null;
                                                                // Optimistic local update
                                                                setOneOffs(prev => {
                                                                    const list = prev.map(o => o.id === item.id ? { ...o, title, description } : o);
                                                                    try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                                    return list;
                                                                });
                                                                const canSync = navigator.onLine && serverOnline;
                                                                try {
                                                                    if (canSync) {
                                                                        await api.updateOneOffTodo(item.id, { title, description });
                                                                    } else {
                                                                        setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'update' as const, id: item.id, title, description }]); saveOneOffPending(next); return next; });
                                                                    }
                                                                } catch (e) {
                                                                    setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'update' as const, id: item.id, title, description }]); saveOneOffPending(next); return next; });
                                                                }
                                                                setEditingId(null);
                                                                setEditTitle('');
                                                                setEditDesc('');
                                                            }}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Save</span>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center gap-2"
                                                            onClick={() => { setEditingId(null); setEditTitle(''); setEditDesc(''); }}
                                                        >
                                                            <X className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Cancel</span>
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex items-center gap-2"
                                                        onClick={() => { setEditingId(item.id); setEditTitle(item.title); setEditDesc(item.description || ''); }}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        if (!confirm('Delete this one-off?')) return;
                                                        // Optimistic local delete
                                                        setOneOffs(prev => {
                                                            const list = prev.filter(o => o.id !== item.id);
                                                            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                            return list;
                                                        });
                                                        // If this is a temp item (negative id), just cancel the queued create and exit
                                                        if (item.id < 0) {
                                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'delete' as const, id: item.id }]); saveOneOffPending(next); return next; });
                                                            return;
                                                        }
                                                        const canSync = navigator.onLine && serverOnline;
                                                        try {
                                                            if (canSync) await api.deleteOneOffTodo(item.id);
                                                            else {
                                                                setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'delete' as const, id: item.id }]); saveOneOffPending(next); return next; });
                                                            }
                                                        } catch (e) {
                                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'delete' as const, id: item.id }]); saveOneOffPending(next); return next; });
                                                        }
                                                    }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Delete</span>
                                                </Button>
                                            </div>
                                        </div>
                                        {/* Status buttons row below title/description */}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {(['incomplete', 'in-progress', 'complete', 'skipped'] as const).filter(s => s !== item.status).map(s => {
                                                const disabled = editingId === item.id;
                                                if (s === 'incomplete') return (
                                                    <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={async () => {
                                                        // Optimistic update
                                                        setOneOffs(prev => {
                                                            const list = prev.map(o => o.id === item.id ? { ...o, status: 'incomplete' as TaskStatus } : o);
                                                            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                            return list;
                                                        });
                                                        const canSync = navigator.onLine && serverOnline;
                                                        try {
                                                            if (canSync) await api.updateOneOffStatus(item.id, 'incomplete');
                                                            else {
                                                                setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'incomplete' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                            }
                                                        } catch (e) {
                                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'incomplete' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                        }
                                                    }} disabled={disabled} aria-label="Mark as incomplete"><Circle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Incomplete</span></Button>
                                                )
                                                if (s === 'in-progress') return (
                                                    <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={async () => {
                                                        // Optimistic update
                                                        setOneOffs(prev => {
                                                            const list = prev.map(o => o.id === item.id ? { ...o, status: 'in-progress' as TaskStatus } : o);
                                                            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                            return list;
                                                        });
                                                        const canSync = navigator.onLine && serverOnline;
                                                        try {
                                                            if (canSync) await api.updateOneOffStatus(item.id, 'in-progress');
                                                            else {
                                                                setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'in-progress' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                            }
                                                        } catch (e) {
                                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'in-progress' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                        }
                                                    }} disabled={disabled} aria-label="Mark as in progress"><CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">In Progress</span></Button>
                                                )
                                                if (s === 'complete') return (
                                                    <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={async () => {
                                                        // Optimistic update
                                                        setOneOffs(prev => {
                                                            const list = prev.map(o => o.id === item.id ? { ...o, status: 'complete' as TaskStatus } : o);
                                                            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                            return list;
                                                        });
                                                        const canSync = navigator.onLine && serverOnline;
                                                        try {
                                                            if (canSync) await api.updateOneOffStatus(item.id, 'complete');
                                                            else {
                                                                setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'complete' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                            }
                                                        } catch (e) {
                                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'complete' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                        }
                                                    }} disabled={disabled} aria-label="Mark as complete"><Check className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Complete</span></Button>
                                                )
                                                return (
                                                    <Button key={s} size="sm" variant={s === item.status ? 'default' : 'outline'} onClick={async () => {
                                                        // Optimistic update
                                                        setOneOffs(prev => {
                                                            const list = prev.map(o => o.id === item.id ? { ...o, status: 'skipped' as TaskStatus } : o);
                                                            try { localStorage.setItem(LS_ONEOFFS, JSON.stringify(list)); } catch { }
                                                            return list;
                                                        });
                                                        const canSync = navigator.onLine && serverOnline;
                                                        try {
                                                            if (canSync) await api.updateOneOffStatus(item.id, 'skipped');
                                                            else {
                                                                setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'skipped' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                            }
                                                        } catch (e) {
                                                            setOneOffPending(prev => { const next = compressOneOffOps([...prev, { kind: 'status' as const, id: item.id, status: 'skipped' as TaskStatus }]); saveOneOffPending(next); return next; });
                                                        }
                                                    }} disabled={disabled} aria-label="Mark as skipped"><SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Skip</span></Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
            {/* Fixed footer (permanent bottom bar) with controls and indicators */}
            <footer
                ref={footerRef as any}
                className="fixed bottom-0 left-0 right-0 w-full bg-background border-t shadow-lg z-20 transform-gpu will-change-transform"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', contain: 'layout paint', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div
                    className="container mx-auto px-4 h-14 flex items-center gap-3 max-w-4xl"
                >
                    {/* Connectivity dot */}
                    <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${(isOnline && serverOnline) ? 'bg-success' : 'bg-destructive'}`}
                        title={(isOnline && serverOnline) ? 'Online' : 'Offline'}
                        aria-label={(isOnline && serverOnline) ? 'Online' : 'Offline'}
                    />
                    {/* Sync indicator */}
                    <span className="text-xs text-muted-foreground">
                        {(() => {
                            const queued = pendingQueue.length + oneOffPending.length;
                            if (isSyncing) return `Syncing… ${queued} left`;
                            if (queued > 0) return `${queued} update${queued === 1 ? '' : 's'} queued`;
                            return 'All changes synced';
                        })()}
                    </span>
                    <div className="ml-auto flex gap-2">
                        <Button
                            onClick={() => loadData(false)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <Button
                            onClick={handleReset}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reset All</span>
                        </Button>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
