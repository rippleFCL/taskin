import { CategoryWithTodos, TaskStatus, TodoWithCategory, OneOffTodo, DependencyGraph, ResetReport, AggregatedStatistics, Timeslot } from './types';

const API_BASE = '/api';

export const api = {
  // Categories
  async getCategories(): Promise<CategoryWithTodos[]> {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  async getCategory(id: number): Promise<CategoryWithTodos> {
    const response = await fetch(`${API_BASE}/categories/${id}`);
    if (!response.ok) throw new Error('Failed to fetch category');
    return response.json();
  },

  // Todos
  async getTodos(): Promise<TodoWithCategory[]> {
    const response = await fetch(`${API_BASE}/todos`);
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  },

  async getRecommendedTodos(): Promise<TodoWithCategory[]> {
    const response = await fetch(`${API_BASE}/recommended-todos`);
    if (!response.ok) throw new Error('Failed to fetch recommended todos');
    return response.json();
  },

  async updateTodoStatus(id: number, status: TaskStatus): Promise<void> {
    const response = await fetch(`${API_BASE}/todos/${id}/status?status=${status}`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to update todo status');
  },

  // One-off todos
  async getOneOffTodos(): Promise<OneOffTodo[]> {
    const response = await fetch(`${API_BASE}/oneoff-todos`);
    if (!response.ok) throw new Error('Failed to fetch one-off todos');
    return response.json();
  },

  async getRecommendedOneOffTodos(): Promise<OneOffTodo[]> {
    const response = await fetch(`${API_BASE}/recommended-oneoffs`);
    if (!response.ok) throw new Error('Failed to fetch recommended one-off todos');
    return response.json();
  },

  async createOneOffTodo(data: { title: string; description?: string | null }): Promise<OneOffTodo> {
    const response = await fetch(`${API_BASE}/oneoff-todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create one-off todo');
    return response.json();
  },

  async updateOneOffStatus(id: number, status: TaskStatus): Promise<void> {
    const response = await fetch(`${API_BASE}/oneoff-todos/${id}/status?status=${status}`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to update one-off status');
  },

  async updateOneOffTodo(id: number, data: { title?: string; description?: string | null; status?: TaskStatus }): Promise<OneOffTodo> {
    const response = await fetch(`${API_BASE}/oneoff-todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update one-off todo');
    return response.json();
  },

  async deleteOneOffTodo(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/oneoff-todos/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) throw new Error('Failed to delete one-off todo');
  },

  // Dependency graph
  async getDependencyGraph(graphType: 'scoped' | 'full' = 'scoped', filterTimeDeps: boolean = false): Promise<DependencyGraph> {
    const response = await fetch(`${API_BASE}/dependency-graph?graph_type=${graphType}&filter_time_deps=${filterTimeDeps}`);
    if (!response.ok) throw new Error('Failed to fetch dependency graph');
    return response.json();
  },

  // Reports
  async getReportsByDateRange(start: Date | string, end: Date | string): Promise<ResetReport[]> {
    const toIso = (d: Date | string) => {
      if (d instanceof Date) return d.toISOString();
      // If date-only string (YYYY-MM-DD), assume full day range when used
      // Here we pass through; caller ensures start/end cover full day as needed
      try { return new Date(d).toISOString(); } catch { return String(d); }
    };
    const startIso = encodeURIComponent(toIso(start));
    const endIso = encodeURIComponent(toIso(end));
    const response = await fetch(`${API_BASE}/reports/${startIso}/${endIso}`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    const data = await response.json();
    const arr: any[] = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
    return arr.map((r: ResetReport) => ({
      ...r,
      task_reports: Array.isArray((r as any).task_reports) ? (r as any).task_reports : [],
    }));
  },

  async getStatisticsByDateRange(start: Date | string, end: Date | string): Promise<AggregatedStatistics> {
    const toIso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
    const startIso = encodeURIComponent(toIso(start));
    const endIso = encodeURIComponent(toIso(end));
    const response = await fetch(`${API_BASE}/statistics/${startIso}/${endIso}`);
    if (!response.ok) throw new Error('Failed to fetch statistics');
    return response.json();
  },

  // Timeslots
  async getTimeslots(): Promise<Record<number, Timeslot>> {
    const response = await fetch(`${API_BASE}/timeslots`);
    if (!response.ok) throw new Error('Failed to fetch timeslots');
    return response.json();
  },
};
