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
