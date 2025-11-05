import { Todo, TaskStatus } from '../types';
import { Button } from './ui/button';
import { Check, Circle, CircleDashed, SkipForward } from 'lucide-react';
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

    return (
        <div className="py-4">
            <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex-1">
                    <h4 className="text-base font-medium text-foreground flex items-center gap-2">
                        {todo.title}
                        <Badge variant="outline" className="hidden sm:inline-flex">{getStatusLabel(todo.status).replace(/^[^\s]+\s*/, '')}</Badge>
                    </h4>
                    {todo.description && (
                        <p className="text-sm text-muted-foreground">{todo.description}</p>
                    )}
                </div>
                {/* Small colored dot for quick glance */}
                <div className="ml-2 mt-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getStatusColor(todo.status) }} title={getStatusLabel(todo.status)} />
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
                {statuses.filter(s => s !== todo.status).map(s => {
                    if (s === 'incomplete') {
                        return (
                            <Button
                                key={s}
                                variant={s === todo.status ? 'default' : 'outline'}
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
                                variant={s === todo.status ? 'default' : 'outline'}
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
                                variant={s === todo.status ? 'default' : 'outline'}
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
                            variant={s === todo.status ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange('skipped')}
                            aria-label="Mark as skipped"
                        >
                            <SkipForward className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Skip</span>
                        </Button>
                    );
                })}
            </div>

            {/* Keep an accessible textual label for screen-readers and smaller screens */}
            <div className="text-sm font-medium sm:hidden" style={{ color: getStatusColor(todo.status) }}>
                {getStatusLabel(todo.status)}
            </div>
        </div>
    );
}
