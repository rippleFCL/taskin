import { CategoryWithTodos, TaskStatus } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { CategoryCard } from '../components/CategoryCard';
import { Check, Circle, CircleDashed, SkipForward } from 'lucide-react';

type AllSummary = {
    total: number;
    categories: number;
    incomplete: number;
    inProgress: number;
    complete: number;
    skipped: number;
    percentComplete: number;
    readyNow: number;
};

interface Props {
    categories: CategoryWithTodos[];
    summary: AllSummary;
    onStatusChange: (id: number, status: TaskStatus) => void;
}

export default function AllTasksPage({ categories, summary, onStatusChange }: Props) {
    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <Card className="bg-background/60">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="text-sm text-muted-foreground">Overview</div>
                        <div className="text-xs text-muted-foreground">
                            {summary.complete}/{summary.total} complete
                        </div>
                    </div>
                    <Progress value={summary.percentComplete} />
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-7 gap-3 text-sm">
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
                        <div className="rounded-md border p-3 bg-muted/40">
                            <div className="text-muted-foreground text-xs">Categories</div>
                            <div className="font-medium">{summary.categories}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No categories found</div>
            ) : (
                categories.map(category => (
                    <CategoryCard
                        key={category.id}
                        category={category}
                        onStatusChange={onStatusChange}
                    />
                ))
            )}
        </div>
    );
}
