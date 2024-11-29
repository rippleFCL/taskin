import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Button, Input, Select } from '@mui/material';
import { TaskMode } from '../types';
import { TaskSet, Task } from '../client/types.gen';

interface TaskProps {
  createTask: (task: TaskSet) => void;
  mode?: TaskMode;
  task: Task;
  updateTask: (task: TaskSet) => void;
}

const TaskComponent: React.FC<TaskProps> = (props) => {
  const { task, createTask } = props;
  const [mode, setMode] = useState<TaskMode>(props.mode || TaskMode.view);
  const taskForm = useRef<HTMLFormElement>(null);

  const reset = () => {
    setMode(TaskMode.view);
  }

  // TODO: Check this useEffect
  useEffect(() => {
    if (mode === TaskMode.create) {
      reset();
    }
  }, [mode]);

  const formTitles = {
      [TaskMode.create]: 'Create',
      [TaskMode.edit]: 'Edit',
      [TaskMode.view]: 'Your Todo'
  }

  const renderControls = (save: () => void) => {
    if (mode === TaskMode.create) {
      return <Button variant="outlined" color="primary" onClick={() => {
        setMode(TaskMode.view);
        save()
      }}>Save</Button>
    } else if (mode === TaskMode.edit) {
      return <>
        <Button variant="outlined" color="primary" onClick={() => setMode(TaskMode.view)}>Cancel</Button>
        <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
      </>
    } else if (mode === TaskMode.view) {
      return <Button variant="outlined" color="primary" onClick={() => setMode(TaskMode.edit)}>Edit</Button>
    }

    return <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
  }

  const validateAndUpdateTodo = (task: Task) => {
    if (!taskForm.current) {
      console.warn('Form not found');
      return;
    }

    const formData = new FormData(taskForm.current);
    const taskParams = Object.keys(task) as (keyof TaskSet)[];

    const payload: TaskSet = {} as TaskSet;
    taskParams.forEach((p) => {
      // @typescript-eslint/no-explicit-any
      payload[p] = formData.get(p) ? formData.get(p) as any : task[p];
    });

    // TODO: Bring ZOD Into do validation here.
    if (!payload.name) {
      console.warn('Name is required');
      return;
    }

    if (!payload.category_id) {
      console.warn('Status is required');
      return;
    }

    createTask(payload);
  }

  if (mode !== TaskMode.view) {
    return (
      <Box p={1} m={1}>
        <h1>{formTitles[mode]}</h1>
        <form ref={taskForm}>
          <Input type="text" />
          <Select native>
            <option value="todo">Todo</option>
            <option value="comp">Comp</option>
            <option value="in_prog">In Progress</option>
          </Select>
        </form>

        {renderControls((task: TaskSet) => {
          validateAndUpdateTodo(task);
        })}
      </Box>
    );
  }

  return (
    <Box p={1} m={1}>
      <h1>{task.name ? task.name : 'Your Todo'}</h1>
      <p>{task.category_id}</p>
      {renderControls(() => {
        validateAndUpdateTodo(task);
        setMode(TaskMode.view);
      })}

    </Box>
  );
};

export default TaskComponent;
