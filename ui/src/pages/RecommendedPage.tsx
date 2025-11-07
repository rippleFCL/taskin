import { TodoWithCategory, TaskStatus, OneOffTodo } from '../types';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { statusButtonClasses, statusBadgeClasses } from '../lib/utils';
import { Check, Circle, CircleDashed, SkipForward } from 'lucide-react';

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



    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <p className="text-sm text-muted-foreground text-center mb-6">
                Tasks ready to work on (all dependencies satisfied)
            </p>
            {/* Recommended regular todos */}
            <div className="space-y-3">
                {todos.map(todo => {
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
                })}
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
