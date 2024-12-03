import React, { useEffect, useRef, useState } from 'react';
import { Input, Select } from '@mui/material';
import { NoReloadButton as Button } from './NoReloadButton';
import { TaskMode } from '../types';
import { TTask, StatusEnum, TCategory } from '../client/types.gen';
import { Item } from "../styles";

interface TaskProps {
  createTask: (task: TTask | null, newTask: TTask) => void;
  updateTask: (task: TTask | null, newTask: TTask) => void;
  deleteTask: (task: TTask) => void;
  mode: TaskMode;
  task: TTask | null;
  categories: TCategory[] | undefined;
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

  const statusProgression = () => {
    if (!task) {
      return;
    }
    const statusMaping = {
      "todo": "in_prog",
      "in_prog": "comp",
      "comp": "todo"
    }
    const newTask = { ...task, status: statusMaping[task.status] }
    updateTask(task, newTask as unknown as TTask)
  }

  const RenderStatusControls = () => {
    if (!task) {
      return;
    }
    const statusMaping = {
      "todo": "Mark as in progress",
      "in_prog": "Mark as completed",
      "comp": "Mark as todo"
    }
    return <Button variant="outlined" color="primary" onClick={() => statusProgression()}>{statusMaping[task.status]}</Button>

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
      return <>
        <Button variant="outlined" color="primary" onClick={() => setMode(TaskMode.edit)}>Edit</Button>
        {RenderStatusControls()}
      </>

    }

    return <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
  }

  const formatAndSaveTask = (new_task: TTask, save: ((task: TTask | null, newTask: TTask) => void) | null) => {
    if (!taskForm.current) {
      console.warn('Form not found');
      return;
    }
    const catId = taskForm.current?.querySelector('select')?.value
    console.log(catId)
    const payload: TTask = {
      ...new_task,
      id: new_task.id ?? null,
      status: new_task.status ?? "todo",
      category_id: (catId === "" ? null : catId),
      name: taskForm.current?.querySelector('input')?.value ?? new_task.name,
    }
    if (save !== null) {
      console.log(payload, task, save)
      save(task, payload);
    }
  }
  const catSelector = () => {
    console.log(task?.category_id)
    return <>{
      props.categories ?
        <Select native defaultValue={task?.category_id ?? ""}>
          {props.categories?.map((category: TCategory) => (
            <option key={category.id} value={category.id ? category.id : ""} >{category.name}</option>
          ))}
        </Select> : <></>
    }</>
  }
  if (task === null) {
    return (
      <Item elevation={3}>
        <h1>New Task</h1>
        <form ref={taskForm} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); } }}>
          <Input type="text" />
          {catSelector()}
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

      </Item>
    );
  }
  if (mode !== TaskMode.view) {
    return (
      <Item elevation={3}>
        <h1>{formTitles[mode]}</h1>
        <form ref={taskForm} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); } }} >
          <Input type="text" defaultValue={task.name} />
          {catSelector()}
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
      </Item>
    );
  }

  return (
    <Item elevation={3}>

      <h1>{task.name ? task.name : 'Your Todo'}</h1>
      <h2>{task.status}</h2>
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

    </Item>
  );
};

export default TaskComponent;
