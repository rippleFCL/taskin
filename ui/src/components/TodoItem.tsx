import { Todo, TaskStatus } from '../types';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { cn, statusButtonClasses, statusBadgeClasses } from '../lib/utils';
import { Check, Circle, CircleDashed, SkipForward, Clock } from 'lucide-react';
import { Badge } from './ui/badge';

interface TodoItemProps {
    todo: Todo;
    onStatusChange: (id: number, status: TaskStatus) => void;
}

export function TodoItem({ todo, onStatusChange }: TodoItemProps) {
    const handleStatusChange = (newStatus: TaskStatus) => {
        // Optimistic update delegated to parent
        onStatusChange(todo.id, newStatus);
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case 'complete':
                return '#22c55e';
            case 'in-progress':
                return '#3b82f6';
            case 'skipped':
                return '#f97316';
            case 'incomplete':
                return '#64748b';
        }
    };

    const getStatusLabel = (status: TaskStatus) => {
        switch (status) {
            case 'complete':
                return '✓ Complete';
            case 'in-progress':
                return '◐ In Progress';
            case 'skipped':
                return '⏭ Skipped';
            case 'incomplete':
                return '○ Incomplete';
        }
    };

    const statuses: TaskStatus[] = ['incomplete', 'in-progress', 'complete', 'skipped'];

    // Realtime elapsed using server-provided start time and cumulative seconds
    const startIso = (todo as any).in_progress_start as string | undefined | null;
    const priorSeconds = Math.max(0, Math.floor(((todo as any).cumulative_in_progress_seconds as number) || 0));
    const [nowMs, setNowMs] = useState<number>(Date.now());
    useEffect(() => {
        if (todo.status !== 'in-progress' || !startIso) return;
        const t = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todo.id, todo.status, startIso]);
    const startMs = startIso ? Date.parse(startIso) : null;
    const runningAdd = (todo.status === 'in-progress' && startMs) ? Math.max(0, Math.floor((nowMs - startMs) / 1000)) : 0;
    const displaySeconds = priorSeconds + runningAdd;

    const formatDuration = (seconds: number) => {
        if (!seconds || seconds <= 0) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    return (
        <div className="py-4">
            <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex-1">
                    <h4 className="text-base font-medium text-foreground flex items-center gap-2">
                        {todo.title}
                        <Badge className={cn('hidden sm:inline-flex', statusBadgeClasses[todo.status])}>{getStatusLabel(todo.status).replace(/^[^\s]+\s*/, '')}</Badge>
                        {(displaySeconds > 0 || todo.status === 'in-progress') && (
                            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-muted/60 text-sm font-mono text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(displaySeconds)}
                            </span>
                        )}
                    </h4>
                    {todo.description && (
                        <p className="text-sm text-muted-foreground">{todo.description}</p>
                    )}
                </div>
                {/* Removed status dot in favor of colored badge */}
            </div>

            {/* Action buttons and in-progress time */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
                {/* Actions */}
                {statuses.filter(s => s !== todo.status).map(s => {
                    const classes = cn('flex items-center gap-1.5 border', statusButtonClasses[s]);
                    if (s === 'incomplete') {
                        return (
                            <Button
                                key={s}
                                variant="outline"
                                className={classes}
                                size="sm"
                                onClick={() => handleStatusChange('incomplete')}
                                aria-label="Mark as incomplete"
                            >
                                <Circle className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Incomplete</span>
                            </Button>
                        );
                    }
                    if (s === 'in-progress') {
                        return (
                            <Button
                                key={s}
                                variant="outline"
                                className={classes}
                                size="sm"
                                onClick={() => handleStatusChange('in-progress')}
                                aria-label="Mark as in progress"
                            >
                                <CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">In Progress</span>
                            </Button>
                        );
                    }
                    if (s === 'complete') {
                        return (
                            <Button
                                key={s}
                                variant="outline"
                                className={classes}
                                size="sm"
                                onClick={() => handleStatusChange('complete')}
                                aria-label="Mark as complete"
                            >
                                <Check className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Complete</span>
                            </Button>
                        );
                    }
                    return (
                        <Button
                            key={s}
                            variant="outline"
                            className={classes}
                            size="sm"
                            onClick={() => handleStatusChange('skipped')}
                            aria-label="Mark as skipped"
                        >
                            <SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Skip</span>
                        </Button>
                    );
                })}
                {/* Realtime timer moved next to title to match Recommended page styling */}
            </div>

            {/* Keep an accessible textual label for screen-readers and smaller screens */}
            <div className="text-sm font-medium sm:hidden" style={{ color: getStatusColor(todo.status) }}>
                {getStatusLabel(todo.status)}
            </div>
        </div>
    );
}
