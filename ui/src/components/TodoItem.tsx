import { Todo, TaskStatus } from '../types';
import { Button } from './ui/button';
import { Check, Circle, CircleDashed } from 'lucide-react';

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
            case 'incomplete':
                return '○ Incomplete';
        }
    };

    return (
        <div className="py-4">
            <div className="mb-2">
                <h4 className="text-base font-medium text-foreground">{todo.title}</h4>
                {todo.description && (
                    <p className="text-sm text-muted-foreground">{todo.description}</p>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
                <Button
                    variant={todo.status === 'incomplete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('incomplete')}
                    aria-label="Mark as incomplete"
                >
                    <Circle className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Incomplete</span>
                </Button>
                <Button
                    variant={todo.status === 'in-progress' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('in-progress')}
                    aria-label="Mark as in progress"
                >
                    <CircleDashed className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">In Progress</span>
                </Button>
                <Button
                    variant={todo.status === 'complete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange('complete')}
                    aria-label="Mark as complete"
                >
                    <Check className="w-4 h-4 sm:mr-2 shrink-0" /> <span className="hidden sm:inline">Complete</span>
                </Button>
            </div>

            <div className="text-sm font-medium" style={{ color: getStatusColor(todo.status) }}>
                {getStatusLabel(todo.status)}
            </div>
        </div>
    );
}
