import { useState, useEffect } from 'react';
import { ResetReport, AggregatedStatistics } from '../types';
import { api } from '../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, TrendingUp, CheckCircle, XCircle, SkipForward } from 'lucide-react';

interface ReportsPageProps { }

const ReportsPage = (_props: ReportsPageProps) => {
    const [reports, setReports] = useState<ResetReport[]>([]);
    const [statistics, setStatistics] = useState<AggregatedStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Non-blocking error handling: we render empty states instead of showing errors
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
            setReports(repRes.value);
        } else {
            // If reports API fails, show no reports
            setReports([]);
        }
        if (statRes.status === 'fulfilled') {
            setStatistics(statRes.value);
        } else {
            // If stats API fails, hide statistics section
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

    // Do not block the page on errors; we will render empty states instead

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Reports</h1>
                    <p className="text-muted-foreground">Task completion reports and statistics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
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
                            className="px-3 py-1.5 rounded-md border bg-background text-foreground"
                        >
                            <option value={5}>5 days</option>
                            <option value={10}>10 days</option>
                            <option value={20}>20 days</option>
                            <option value={30}>30 days</option>
                            <option value="custom">Custom…</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
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
                                        // Ensure start <= end
                                        if (val && endDate && val > endDate) {
                                            setEndDate(val);
                                        }
                                        setStartDate(val);
                                    }}
                                    className="px-3 py-1.5 rounded-md border bg-background text-foreground"
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
                            className="px-3 py-1.5 rounded-md border bg-background text-foreground"
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
                            <div className="space-y-4">
                                {statistics.task_statistics.length === 0 ? (
                                    <p className="text-muted-foreground">No statistics available yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2 px-2 font-semibold">Task</th>
                                                    <th className="text-left py-2 px-2 font-semibold">Category</th>
                                                    <th className="text-right py-2 px-2 font-semibold">Completion</th>
                                                    <th className="text-right py-2 px-2 font-semibold">Skip Rate</th>
                                                    <th className="text-right py-2 px-2 font-semibold">Avg In-Progress</th>
                                                    <th className="text-right py-2 px-2 font-semibold">Completed</th>
                                                    <th className="text-right py-2 px-2 font-semibold">Skipped</th>
                                                    <th className="text-right py-2 px-2 font-semibold">Incomplete</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {statistics.task_statistics.map((stat) => (
                                                    <tr key={stat.todo_id} className="border-b hover:bg-muted/50">
                                                        <td className="py-2 px-2">{stat.todo_title}</td>
                                                        <td className="py-2 px-2 text-muted-foreground">{stat.category_name}</td>
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
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Clock className="w-5 h-5" />
                                                Reset Report #{report.id}
                                            </CardTitle>
                                            <CardDescription>{formatDate(report.created_at)}</CardDescription>
                                        </div>
                                        <div className="flex gap-2 text-sm">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                {report.completed_todos} completed
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <SkipForward className="w-4 h-4 text-yellow-600" />
                                                {report.skipped_todos} skipped
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <XCircle className="w-4 h-4 text-gray-600" />
                                                {report.incomplete_todos} incomplete
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="mb-3">
                                        <div className="text-sm text-muted-foreground mb-2">
                                            Total tasks processed: {report.total_todos}
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full bg-green-500"
                                                style={{
                                                    width: `${report.total_todos > 0 ? (report.completed_todos / report.total_todos) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {(report.task_reports?.length ?? 0) > 0 && (
                                        <details className="mt-4">
                                            <summary className="cursor-pointer font-semibold hover:text-primary">
                                                View {(report.task_reports?.length ?? 0)} task details
                                            </summary>
                                            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                                                {(report.task_reports ?? []).map((task) => (
                                                    <div
                                                        key={task.id}
                                                        className="flex items-center justify-between py-2 px-3 rounded-md border hover:bg-muted/50"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium">{task.todo_title}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {task.category_name}
                                                            </div>
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
                                        </details>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
