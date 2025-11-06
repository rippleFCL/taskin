import { useState, useEffect } from 'react';
import { ResetReport, AggregatedStatistics } from '../types';
import { api } from '../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Clock, TrendingUp, CheckCircle, XCircle, SkipForward, ChevronDown } from 'lucide-react';

interface ReportsPageProps { }

const ReportsPage = (_props: ReportsPageProps) => {
    const [reports, setReports] = useState<ResetReport[]>([]);
    const [statistics, setStatistics] = useState<AggregatedStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Date range selection; default to last 10 days
    const [reportLimit, setReportLimit] = useState(10);
    const [lastMode, setLastMode] = useState<'preset' | 'custom'>('preset');
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 9); // inclusive of today -> 10 days
        return d.toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [activeTab, setActiveTab] = useState<'summary' | 'reports'>('summary');

    const MIN_DATE = '2000-01-01';
    const MAX_DATE = '2100-12-31';
    const sanitizeDateInput = (v: string) => {
        // Expect YYYY-MM-DD; clamp year range to avoid huge numbers
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        const year = parseInt(v.slice(0, 4), 10);
        if (year < 2000) return MIN_DATE;
        if (year > 2100) return MAX_DATE;
        return v;
    };

    useEffect(() => {
        if (lastMode === 'preset') {
            // When preset mode or limit changes, adjust startDate relative to endDate
            const end = new Date(endDate);
            const s = new Date(end);
            s.setDate(end.getDate() - (reportLimit - 1));
            setStartDate(s.toISOString().slice(0, 10));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportLimit, endDate, lastMode]);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const loadData = async () => {
        setIsLoading(true);
        // Build full-day ISO datetimes from date-only inputs
        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);
        const [repRes, statRes] = await Promise.allSettled([
            api.getReportsByDateRange(start, end),
            api.getStatisticsByDateRange(start, end),
        ]);
        if (repRes.status === 'fulfilled') {
            const sorted = [...repRes.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setReports(sorted);
        } else {
            setReports([]);
        }
        if (statRes.status === 'fulfilled') {
            setStatistics(statRes.value);
        } else {
            setStatistics(null);
        }
        setIsLoading(false);
    };

    const formatDuration = (seconds: number | null) => {
        if (seconds === null) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'incomplete': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'skipped': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading reports...</p>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Reports</h1>
                    <p className="text-muted-foreground">Task completion reports and statistics</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm text-muted-foreground">Show last:</label>
                        <select
                            value={lastMode === 'custom' ? 'custom' : String(reportLimit)}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === 'custom') {
                                    setLastMode('custom');
                                } else {
                                    setLastMode('preset');
                                    const n = Number(v);
                                    setReportLimit(Number.isFinite(n) && n > 0 ? n : 10);
                                }
                            }}
                            className="px-3 py-1.5 rounded-md border bg-background text-foreground w-full sm:w-auto"
                        >
                            <option value={5}>5 days</option>
                            <option value={10}>10 days</option>
                            <option value={20}>20 days</option>
                            <option value={30}>30 days</option>
                            <option value="custom">Custom…</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {lastMode === 'custom' && (
                            <>
                                <label className="text-sm text-muted-foreground">From</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    min={MIN_DATE}
                                    max={endDate || MAX_DATE}
                                    onChange={(e) => {
                                        const val = sanitizeDateInput(e.target.value);
                                        if (val && endDate && val > endDate) {
                                            setEndDate(val);
                                        }
                                        setStartDate(val);
                                    }}
                                    className="px-3 py-1.5 rounded-md border bg-background text-foreground w-full sm:w-auto"
                                />
                            </>
                        )}
                        <label className="text-sm text-muted-foreground">to</label>
                        <input
                            type="date"
                            value={endDate}
                            min={lastMode === 'custom' ? startDate || MIN_DATE : MIN_DATE}
                            max={MAX_DATE}
                            onChange={(e) => {
                                const val = sanitizeDateInput(e.target.value);
                                setEndDate(val);
                            }}
                            className="px-3 py-1.5 rounded-md border bg-background text-foreground w-full sm:w-auto"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b">
                <button
                    className={`px-3 py-2 -mb-px border-b-2 ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('summary')}
                >
                    Summary
                </button>
                <button
                    className={`px-3 py-2 -mb-px border-b-2 ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('reports')}
                >
                    Reports
                </button>
            </div>

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                statistics ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Aggregated Statistics
                            </CardTitle>
                            <CardDescription>
                                Based on the last {statistics.report_count} reports
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {statistics.task_statistics.length === 0 ? (
                                    <p className="text-muted-foreground">No statistics available yet.</p>
                                ) : (
                                    (() => {
                                        const byCategory: Record<string, typeof statistics.task_statistics> = {} as any;
                                        for (const s of statistics.task_statistics) {
                                            const key = s.category_name || 'Uncategorized';
                                            (byCategory[key] ||= []).push(s);
                                        }
                                        const cats = Object.keys(byCategory).sort();
                                        return (
                                            <div className="space-y-3">
                                                {cats.map((cat) => {
                                                    return (
                                                        <div key={cat} className="border rounded-md">
                                                            <div className="px-3 py-3">
                                                                <div className="text-base font-medium">{cat}</div>
                                                            </div>
                                                            <div className="overflow-x-auto border-t">
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="border-b">
                                                                            <th className="text-left py-2 px-2 font-semibold sticky left-0 z-10 bg-background border-r">Task</th>
                                                                            <th className="text-right py-2 px-2 font-semibold">Comp Rate</th>
                                                                            <th className="text-right py-2 px-2 font-semibold">Skip Rate</th>
                                                                            <th className="text-right py-2 px-2 font-semibold">Avg Duration</th>
                                                                            <th className="text-right py-2 px-2 font-semibold">Completed</th>
                                                                            <th className="text-right py-2 px-2 font-semibold">Skipped</th>
                                                                            <th className="text-right py-2 px-2 font-semibold">Incomplete</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {byCategory[cat].map((stat) => (
                                                                            <tr key={stat.todo_id} className="border-b hover:bg-muted/50">
                                                                                <td className="py-2 px-2 sticky left-0 z-[1] bg-background border-r">{stat.todo_title}</td>
                                                                                <td className="py-2 px-2 text-right">
                                                                                    <span className={stat.completion_rate >= 0.8 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                                                                                        {(stat.completion_rate * 100).toFixed(0)}%
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-2 px-2 text-right">
                                                                                    <span className={stat.skip_rate >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
                                                                                        {(stat.skip_rate * 100).toFixed(0)}%
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-2 px-2 text-right text-muted-foreground">
                                                                                    {formatDuration(stat.avg_in_progress_duration_seconds)}
                                                                                </td>
                                                                                <td className="py-2 px-2 text-right">{stat.times_completed}</td>
                                                                                <td className="py-2 px-2 text-right">{stat.times_skipped}</td>
                                                                                <td className="py-2 px-2 text-right">{stat.times_incomplete}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No statistics available for the selected date range.
                        </CardContent>
                    </Card>
                )
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Recent Reset Reports</h2>
                    {reports.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                No reports available yet. Reports are generated when you reset todos.
                            </CardContent>
                        </Card>
                    ) : (
                        reports.map((report) => (
                            <Card key={report.id}>
                                <Collapsible defaultOpen={false} className="group">
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <Clock className="w-5 h-5" />
                                                        Reset Report #{report.id}
                                                    </CardTitle>
                                                    <CardDescription>{formatDate(report.created_at)}</CardDescription>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 md:gap-3 md:justify-end">
                                                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                        {report.completed_todos} completed
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                        <SkipForward className="w-4 h-4 text-yellow-600" />
                                                        {report.skipped_todos} skipped
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                        <XCircle className="w-4 h-4 text-gray-600" />
                                                        {report.incomplete_todos} incomplete
                                                    </div>
                                                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <div className="mb-3">
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    Total tasks processed: {report.total_todos}
                                                </div>
                                                {(() => {
                                                    const total = report.total_todos || 0;
                                                    const completedPct = total > 0 ? (report.completed_todos / total) * 100 : 0;
                                                    const skippedPct = total > 0 ? (report.skipped_todos / total) * 100 : 0;
                                                    return (
                                                        <div className="w-full rounded-full h-2 overflow-hidden relative bg-gray-500 dark:bg-gray-700">
                                                            {/* Completed (left) */}
                                                            <div
                                                                className="absolute left-0 top-0 bottom-0 bg-green-500"
                                                                style={{ width: `${completedPct}%` }}
                                                            />
                                                            {/* Skipped (right, dark grey) */}
                                                            <div
                                                                className="absolute right-0 top-0 bottom-0 bg-green-900 dark:bg-green-800"
                                                                style={{ width: `${skippedPct}%` }}
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {(report.task_reports?.length ?? 0) > 0 && (
                                                (() => {
                                                    const byCategory: Record<string, NonNullable<typeof report.task_reports>> = {} as any;
                                                    for (const t of report.task_reports ?? []) {
                                                        const key = t.category_name || 'Uncategorized';
                                                        (byCategory[key] ||= []).push(t);
                                                    }
                                                    const cats = Object.keys(byCategory).sort();
                                                    return (
                                                        <div className="mt-4 space-y-3">
                                                            {cats.map((cat) => {
                                                                const tasks = byCategory[cat];
                                                                const completed = tasks.filter(t => t.final_status === 'complete').length;
                                                                const total = tasks.length;
                                                                return (
                                                                    <div key={cat} className="border rounded-md">
                                                                        <div className="px-3 py-3">
                                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                <div className="text-base font-medium flex items-center gap-2">
                                                                                    {cat}
                                                                                    <Badge variant="secondary">{completed}/{total}</Badge>
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">{tasks.length} tasks</div>
                                                                            </div>
                                                                            <div className="mt-2">
                                                                                {(() => {
                                                                                    const skipped = tasks.filter(t => t.final_status === 'skipped').length;
                                                                                    const completedPct = total > 0 ? (completed / total) * 100 : 0;
                                                                                    const skippedPct = total > 0 ? (skipped / total) * 100 : 0;
                                                                                    return (
                                                                                        <div className="w-full rounded-full h-2 overflow-hidden relative bg-gray-500 dark:bg-gray-700">
                                                                                            <div
                                                                                                className="absolute left-0 top-0 bottom-0 bg-green-500"
                                                                                                style={{ width: `${completedPct}%` }}
                                                                                            />
                                                                                            <div
                                                                                                className="absolute right-0 top-0 bottom-0 bg-green-900 dark:bg-green-800"
                                                                                                style={{ width: `${skippedPct}%` }}
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                                <div className="mt-1 text-xs text-muted-foreground">{completed}/{total} completed</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-2 space-y-2 max-h-96 overflow-y-auto border-t">
                                                                            {tasks.map((task) => (
                                                                                <div
                                                                                    key={task.id}
                                                                                    className="flex items-center justify-between py-2 px-3 hover:bg-muted/50"
                                                                                >
                                                                                    <div className="flex-1">
                                                                                        <div className="font-medium">{task.todo_title}</div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        {task.in_progress_duration_seconds !== null && (
                                                                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                                                <Clock className="w-3 h-3" />
                                                                                                {formatDuration(task.in_progress_duration_seconds)}
                                                                                            </div>
                                                                                        )}
                                                                                        <Badge className={getStatusColor(task.final_status)}>
                                                                                            {task.final_status}
                                                                                        </Badge>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
