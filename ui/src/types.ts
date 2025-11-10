export type TaskStatus = 'incomplete' | 'in-progress' | 'complete' | 'skipped';

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  category_id: number;
  // Deprecated: legacy field for current-cycle seconds (kept optional for backward compatibility)
  in_progress?: number;
  // Start timestamp of current in-progress session (ISO datetime) or null when not in-progress
  in_progress_start?: string | null;
  // Cumulative seconds spent in-progress prior to the current session (or total so far per API semantics)
  cumulative_in_progress_seconds?: number;
}

export interface TodoWithCategory extends Todo {
  category: Category;
}

export interface CategoryWithTodos extends Category {
  todos: Todo[];
}

export interface OneOffTodo {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
}

// Dependency Graph types (from API)
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface DependencyNode {
  id: number;
  title: string;
  // Node type provided by API (see OpenAPI). Supported values include:
  // 'todo' | 'category' | 'oneoff' | 'control'
  node_type: 'todo' | 'category' | 'oneoff' | 'control' | (string & {});
  // Optional border color (note: API uses "boarder_color" - misspelling)
  boarder_color?: RGBColor | null;
}

export interface DependencyEdge {
  from_node_id: number;
  to_node_id: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  // Maps node id to its category name (or "Uncategorised")
  node_category_map?: Record<number, string>;
}

// Reports types
export interface TaskReport {
  id: number;
  todo_id: number;
  todo_title: string;
  category_name: string;
  final_status: TaskStatus;
  in_progress_duration_seconds: number | null;
}

export interface ResetReport {
  id: number;
  created_at: string;
  total_todos: number;
  completed_todos: number;
  skipped_todos: number;
  incomplete_todos: number;
  // Server may omit task_reports in summary responses; default to [] in UI
  task_reports?: TaskReport[];
}

export interface TaskStatistics {
  todo_id: number;
  todo_title: string;
  category_name: string;
  completion_rate: number;
  skip_rate: number;
  avg_in_progress_duration_seconds: number | null;
  times_completed: number;
  times_skipped: number;
  times_incomplete: number;
  total_appearances: number;
  tot_in_progress_duration_seconds: number;
}

export interface AggregatedStatistics {
  report_count: number;
  task_statistics: TaskStatistics[];
}
