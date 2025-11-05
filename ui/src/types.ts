export type TaskStatus = 'incomplete' | 'in-progress' | 'complete';

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
export interface DependencyNode {
  id: number;
  title: string;
  category?: string | null;
  status?: TaskStatus | null;
  reset_interval?: number | null;
  node_type: 'todo' | 'category' | 'special';
}

export type DependencyType = 'todo' | 'category' | 'category_member' | 'all_oneoffs' | 'special';

export interface DependencyEdge {
  from_todo_id: number;
  from_todo_title: string;
  to_todo_id?: number | null;
  to_todo_title?: string | null;
  to_category_id?: number | null;
  to_category_name?: string | null;
  depends_on_all_oneoffs?: boolean;
  dependency_type: DependencyType;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  categories: Category[];
  oneoff_count: number;
}
