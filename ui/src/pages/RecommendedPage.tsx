import { TodoWithCategory, TaskStatus, OneOffTodo } from '../types';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { statusButtonClasses, statusBadgeClasses } from '../lib/utils';
import { Check, Circle, CircleDashed, SkipForward, Clock } from 'lucide-react';

interface Props {
    todos: TodoWithCategory[];
    oneOffs?: OneOffTodo[];
    onStatusChange: (id: number, status: TaskStatus) => void;
    onOneOffStatusChange?: (id: number, status: TaskStatus) => void;
}

export default function RecommendedPage({ todos, oneOffs = [], onStatusChange, onOneOffStatusChange }: Props) {
    if (todos.length === 0 && oneOffs.length === 0) {
        return (
            <div className="bg-background rounded-lg border shadow-sm p-6">
                <div className="text-center py-12">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="font-medium mb-1">No tasks available!</p>
                    <p className="text-sm text-muted-foreground">
                        Either complete all dependencies or all tasks are done.
                    </p>
                </div>
            </div>
        );
    }



    // Reusable, safe timer chip used in lists to avoid hooks inside loops
    function TimerChip({ cumulativeSeconds, startIso, running }: { cumulativeSeconds: number; startIso?: string | null; running: boolean }) {
        // Track current time for realtime ticking
        const [nowMs, setNowMs] = useState<number>(Date.now());
        useEffect(() => {
            if (!running || !startIso) return;
            const t = setInterval(() => setNowMs(Date.now()), 1000);
            return () => clearInterval(t);
        }, [running, startIso]);

        const prior = Math.max(0, Math.floor(cumulativeSeconds || 0));
        const startMs = startIso ? Date.parse(startIso) : null;
        const runningAdd = running && startMs ? Math.max(0, Math.floor((nowMs - startMs) / 1000)) : 0;
        const elapsed = prior + runningAdd;

        const format = (total: number) => {
            if (!total || total <= 0) return '0s';
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = Math.floor(total % 60);
            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
        };
        if (!elapsed && !running) return null;
        return (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-muted/60 text-sm font-mono text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {format(elapsed)}
            </span>
        );
    }

    // Group todos: incomplete on top, others at bottom
    const incompleteTodos = useMemo(() => todos.filter(t => t.status === 'incomplete'), [todos]);
    const otherTodos = useMemo(() => todos.filter(t => t.status !== 'incomplete'), [todos]);

    const renderTodoCard = (todo: TodoWithCategory) => {
        const statuses: TaskStatus[] = ['incomplete', 'in-progress', 'complete', 'skipped'];
        return (
            <div key={todo.id} className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-start gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary text-primary-foreground">
                        {todo.category.name}
                    </span>
                    <h4 className="font-medium flex-1 flex items-center gap-2">
                        {todo.title}
                        <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md', statusBadgeClasses[todo.status])}>
                            {todo.status === 'in-progress' ? 'In Progress' : todo.status === 'complete' ? 'Complete' : todo.status === 'skipped' ? 'Skipped' : 'Incomplete'}
                        </span>
                        <TimerChip cumulativeSeconds={Number((todo as any).cumulative_in_progress_seconds || 0)} startIso={(todo as any).in_progress_start as string | undefined} running={todo.status === 'in-progress'} />
                    </h4>
                </div>
                {todo.description && (
                    <p className="text-sm text-muted-foreground mb-3">{todo.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                    {statuses.filter(s => s !== todo.status).map(s => {
                        const common = `border`;
                        const classes = cn('flex items-center gap-1.5', common, statusButtonClasses[s]);
                        if (s === 'incomplete') return (
                            <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onStatusChange(todo.id, 'incomplete')} aria-label="Mark as incomplete"><Circle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Incomplete</span></Button>
                        );
                        if (s === 'in-progress') return (
                            <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onStatusChange(todo.id, 'in-progress')} aria-label="Mark as in progress"><CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">In Progress</span></Button>
                        );
                        if (s === 'complete') return (
                            <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onStatusChange(todo.id, 'complete')} aria-label="Mark as complete"><Check className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Complete</span></Button>
                        );
                        return (
                            <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onStatusChange(todo.id, 'skipped')} aria-label="Mark as skipped"><SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Skip</span></Button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <p className="text-sm text-muted-foreground text-center mb-6">
                Tasks ready to work on (all dependencies satisfied)
            </p>
            {/* Recommended regular todos */}
            <div className="space-y-3">
                {incompleteTodos.map(renderTodoCard)}

                {/* Divider between incomplete and others */}
                {incompleteTodos.length > 0 && otherTodos.length > 0 && (
                    <div className="flex items-center my-2 gap-2">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-xs text-muted-foreground">In-Progress</span>
                        <div className="h-px bg-border flex-1" />
                    </div>
                )}

                {otherTodos.map(renderTodoCard)}
            </div>

            {/* Recommended one-off todos */}
            {oneOffs.length > 0 && (
                <>
                    <div className="mt-8 mb-2 text-sm text-muted-foreground text-center">One-off tasks ready to work on</div>
                    <div className="space-y-3">
                        {oneOffs.map(item => {
                            const actions = ['in-progress', 'complete', 'skipped', 'incomplete'] as const;
                            return (
                                <div key={item.id} className="p-4 bg-muted/50 rounded-lg border">
                                    <div className="flex items-start gap-2 mb-2">
                                        <h4 className="font-medium flex-1 flex items-center gap-2">
                                            {item.title}
                                            <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md', statusBadgeClasses[item.status])}>
                                                {item.status === 'in-progress' ? 'In Progress' : item.status === 'complete' ? 'Complete' : item.status === 'skipped' ? 'Skipped' : 'Incomplete'}
                                            </span>
                                            <TimerChip cumulativeSeconds={0} startIso={undefined} running={item.status === 'in-progress'} />
                                        </h4>
                                    </div>
                                    {item.description && (
                                        <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {actions.filter(s => s !== item.status).map(s => {
                                            const common = `border`;
                                            const classes = cn('flex items-center gap-1.5', common, statusButtonClasses[s]);
                                            if (s === 'incomplete') return (
                                                <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onOneOffStatusChange && onOneOffStatusChange(item.id, 'incomplete')} aria-label="Mark one-off incomplete"><Circle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Incomplete</span></Button>
                                            );
                                            if (s === 'in-progress') return (
                                                <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onOneOffStatusChange && onOneOffStatusChange(item.id, 'in-progress')} aria-label="Mark one-off in progress"><CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">In Progress</span></Button>
                                            );
                                            if (s === 'complete') return (
                                                <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onOneOffStatusChange && onOneOffStatusChange(item.id, 'complete')} aria-label="Mark one-off complete"><Check className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Complete</span></Button>
                                            );
                                            return (
                                                <Button key={s} size="sm" variant="outline" className={classes} onClick={() => onOneOffStatusChange && onOneOffStatusChange(item.id, 'skipped')} aria-label="Mark one-off skipped"><SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Skip</span></Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
