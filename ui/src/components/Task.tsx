import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Button, Input, Select } from '@mui/material';
import { TaskMode } from '../types';
import { TTask, StatusEnum } from '../client/types.gen';

interface TaskProps {
  createTask: (task: TTask | null, newTask: TTask) => void;
  updateTask: (task: TTask | null, newTask: TTask) => void;
  deleteTask: (task: TTask) => void;
  mode: TaskMode;
  task: TTask | null;
}

const TaskComponent: React.FC<TaskProps> = (props) => {
  const { task, createTask, updateTask, deleteTask } = props;
  const [mode, setMode] = useState<TaskMode>(props.mode);
  const taskForm = useRef<HTMLFormElement>(null);


  const formTitles = {
      [TaskMode.create]: 'Create',
      [TaskMode.edit]: 'Edit',
      [TaskMode.view]: 'Your Todo'
  }

  const renderControls = (save: () => void, removeTask: () => void) => {
    if (mode === TaskMode.create) {
      return <Button variant="outlined" color="primary" onClick={() => {
        save()
      }}>Save</Button>
    } else if (mode === TaskMode.edit) {
      return <>
        <Button variant="outlined" color="primary" onClick={() => setMode(TaskMode.view)}>Cancel</Button>
        <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
        <Button variant="outlined" color="primary" onClick={() => removeTask()}>Delete</Button>

      </>
    } else if (mode === TaskMode.view) {
      return <Button variant="outlined" color="primary" onClick={() => setMode(TaskMode.edit)}>Edit</Button>
    }

    return <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
  }

  const formatAndSaveTask = (new_task: TTask, save: ((task: TTask | null, newTask: TTask) => void) | null) => {
    if (!taskForm.current) {
      console.warn('Form not found');
      return;
    }
    const payload: TTask = {
      ...new_task,
      id: new_task.id ?? null,
      status: (taskForm.current?.querySelector('select')?.value ?? new_task.status) as StatusEnum,
      name: taskForm.current?.querySelector('input')?.value ?? new_task.name,
    }
    if (save !== null) {
      console.log(payload, task, save)
      save(task, payload);
    }
  }

  if(task === null) {
    return (
      <Box p={1} m={1}>
        <h1>New Task</h1>
        <form ref={taskForm}>
          <Input type="text" />
          <Select native>
            <option value="todo">Todo</option>
            <option value="comp">Comp</option>
            <option value="in_prog">In Progress</option>
          </Select>
        </form>
        {renderControls(
          () => {
            formatAndSaveTask({
              id: null,
              name: "default",
              status: "todo",
              category_id: null
            }, createTask);
            setMode(TaskMode.create);
          },
          () => { }
        )}

    </Box>
    );
  }
  if (mode !== TaskMode.view) {
    return (
      <Box p={1} m={1}>
        <h1>{formTitles[mode]}</h1>
        <form ref={taskForm}>
          <Input type="text" defaultValue={task.name}/>
          <Select native>
            <option value="todo">Todo</option>
            <option value="comp">Comp</option>
            <option value="in_prog">In Progress</option>
          </Select>
        </form>

        {renderControls(
          () => {
            formatAndSaveTask(task, updateTask);
            setMode(TaskMode.view);
          },
          () => {
            deleteTask(task);
            setMode(TaskMode.view);
          }
        )}
      </Box>
    );
  }

  return (
    <Box p={1} m={1}>

      <h1>{task.name ? task.name : 'Your Todo'}</h1>
      <h2>{task.status}</h2>
      <p>{task.category_id} </p>
      {renderControls(
        () => {
          formatAndSaveTask(task, null);
          setMode(TaskMode.view);
        },
        () => {
          deleteTask(task);
          setMode(TaskMode.view);
        }
      )}

    </Box>
  );
};

export default TaskComponent;
