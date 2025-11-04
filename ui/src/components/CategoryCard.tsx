import { useState } from 'react';
import { CategoryWithTodos, TaskStatus } from '../types';
import { TodoItem } from './TodoItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CategoryCardProps {
    category: CategoryWithTodos;
    onStatusChange: (id: number, status: TaskStatus) => void;
}

export function CategoryCard({ category, onStatusChange }: CategoryCardProps) {
    const [open, setOpen] = useState(true);
    const [tab, setTab] = useState<'open' | 'completed'>('open');

    const completedCount = category.todos.filter(t => t.status === 'complete').length;
    const totalCount = category.todos.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const sortRank = (status: TaskStatus) => {
        if (status === 'complete') return 0;
        if (status === 'in-progress') return 1;
        return 2;
    };
    const openTodos = category.todos
        .filter(t => t.status !== 'complete')
        .slice()
        .sort((a, b) => sortRank(a.status) - sortRank(b.status) || a.title.localeCompare(b.title));
    const completedTodos = category.todos
        .filter(t => t.status === 'complete')
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <Card>
            <Collapsible open={open} onOpenChange={setOpen}>
                <CardHeader className="py-4">
                    <CollapsibleTrigger className="w-full">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-muted-foreground">
                                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                    {category.name}
                                    <Badge variant="secondary" className="ml-1">
                                        {completedCount}/{totalCount}
                                    </Badge>
                                </CardTitle>
                                {category.description && (
                                    <CardDescription>{category.description}</CardDescription>
                                )}
                                <div className="mt-2">
                                    <Progress value={progress} />
                                </div>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="pt-0">
                        {/* Tabs control */}
                        <div className="flex gap-2 border-b mb-3">
                            <button
                                className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === 'open'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setTab('open')}
                            >
                                Open ({openTodos.length})
                            </button>
                            <button
                                className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === 'completed'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setTab('completed')}
                            >
                                Completed ({completedCount})
                            </button>
                        </div>

                        {totalCount === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-6">No tasks in this category</p>
                        ) : tab === 'completed' ? (
                            completedTodos.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-6">No completed tasks</p>
                            ) : (
                                <div className="divide-y">
                                    {completedTodos.map(todo => (
                                        <TodoItem
                                            key={todo.id}
                                            todo={todo}
                                            onStatusChange={onStatusChange}
                                        />
                                    ))}
                                </div>
                            )
                        ) : openTodos.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-6">No open tasks</p>
                        ) : (
                            <div className="divide-y">
                                {openTodos.map(todo => (
                                    <TodoItem
                                        key={todo.id}
                                        todo={todo}
                                        onStatusChange={onStatusChange}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
