import { TodoWithCategory, TaskStatus } from '../types';
import { Button } from '../components/ui/button';
import { Check, Circle, CircleDashed, SkipForward } from 'lucide-react';

interface Props {
    todos: TodoWithCategory[];
    onStatusChange: (id: number, status: TaskStatus) => void;
}

export default function RecommendedPage({ todos, onStatusChange }: Props) {
    if (todos.length === 0) {
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

    const color = (status: TaskStatus) => status === 'complete' ? '#22c55e' : status === 'in-progress' ? '#3b82f6' : status === 'skipped' ? '#f97316' : '#64748b';

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <p className="text-sm text-muted-foreground text-center mb-6">
                Tasks ready to work on (all dependencies satisfied)
            </p>
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
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-background/40 text-muted-foreground">
                                        {todo.status === 'in-progress' ? 'In Progress' : todo.status === 'complete' ? 'Complete' : todo.status === 'skipped' ? 'Skipped' : 'Incomplete'}
                                    </span>
                                </h4>
                                <div className="ml-2 mt-1">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color(todo.status) }} title={todo.status} />
                                </div>
                            </div>
                            {todo.description && (
                                <p className="text-sm text-muted-foreground mb-3">{todo.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {statuses.filter(s => s !== todo.status).map(s => {
                                    if (s === 'incomplete') return (
                                        <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => onStatusChange(todo.id, 'incomplete')} aria-label="Mark as incomplete"><Circle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Incomplete</span></Button>
                                    );
                                    if (s === 'in-progress') return (
                                        <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => onStatusChange(todo.id, 'in-progress')} aria-label="Mark as in progress"><CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">In Progress</span></Button>
                                    );
                                    if (s === 'complete') return (
                                        <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => onStatusChange(todo.id, 'complete')} aria-label="Mark as complete"><Check className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Complete</span></Button>
                                    );
                                    return (
                                        <Button key={s} size="sm" variant={s === todo.status ? 'default' : 'outline'} onClick={() => onStatusChange(todo.id, 'skipped')} aria-label="Mark as skipped"><SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Skip</span></Button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
