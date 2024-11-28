import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Button, Input, Select } from '@mui/material';
import { ITodo, TodoMode } from '../types';

interface TodoProps {
  todo: ITodo | null;
  createTodo: (todo: ITodo) => void
  setTodos: React.Dispatch<React.SetStateAction<ITodo[]>>;
  mode?: TodoMode;
}

const Todo: React.FC<TodoProps> = (props) => {
  const { todo, createTodo } = props;
  const [mode, setMode] = useState<TodoMode>(props.mode ?? TodoMode.view);
  const todoForm = useRef<HTMLFormElement>(null);

  const renderControls = (save: Function, forceMode?: TodoMode) => {
    if (mode === TodoMode.edit) {
      return <>
        {!todo ? <></> : <Button variant="outlined" color="primary" onClick={() => setMode(TodoMode.view)}>Cancel</Button>}
        <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
      </>
    } else if (mode === TodoMode.view) {
      return <Button variant="outlined" color="primary" onClick={() => setMode(TodoMode.edit)}>Edit</Button>
    }

    return <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>

  }

  const validateAndUpdateTodo = (todo: ITodo) => {
    const { name, category, status } = todo;

    if (!name) {
      console.warn('Name is required');
      return;
    }

    if (!category) {
      console.warn('Category is required');
      return;
    }

    createTodo({
      name: name,
      category: category,
      status: status
    });
  }



  if (mode === TodoMode.edit || !todo) {
    return (
      <Box p={1} m={1}>
        <h1>{!todo ? 'Create' : 'Edit'}</h1>
        <form ref={todoForm}>
          <Input type="text" />
          <Select native>
            <option value="todo">Todo</option>
            <option value="comp">Comp</option>
            <option value="in_prog">In Progress</option>
          </Select>
        </form>

        {renderControls(() => {
          validateAndUpdateTodo({
            name: todoForm.current?.querySelector('input')?.value ?? '',
            category: todoForm.current?.querySelector('select')?.value ?? '',
            status: 'todo'
          });
          !todo ? setMode(TodoMode.edit) : setMode(TodoMode.view)
        }, !todo ? TodoMode.edit : TodoMode.view )}
      </Box>
    );
  }

  return (
    <Box p={1} m={1}>
      <h1>{todo.name ? todo.name : 'Your Todo'}</h1>
      <p>{todo.category.name ? todo.category.name : 'Category'}</p>
      {renderControls(() => {
        validateAndUpdateTodo(todo);
        setMode(TodoMode.view);
      })}

    </Box>
  );
};

export default Todo;
