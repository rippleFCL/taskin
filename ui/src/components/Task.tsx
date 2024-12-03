import React, { useEffect, useRef, useState } from 'react';
import { Input, Select } from '@mui/material';
import { NoReloadButton as Button } from './NoReloadButton';
import { TTask, StatusEnum, TCategory } from '../client/types.gen';
import { Item } from "../styles";
import Modal from '@mui/material/Modal';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { modelStyle } from '../styles';

interface TaskProps {
  createTask: (task: TTask | null, newTask: TTask) => void;
  updateTask: (task: TTask | null, newTask: TTask) => void;
  deleteTask: (task: TTask) => void;
  task: TTask;
  categories: TCategory[] | undefined;
}


const TaskComponent: React.FC<TaskProps> = (props) => {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { task, createTask, updateTask, deleteTask } = props;
  const taskForm = useRef<HTMLFormElement>(null);





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
    return <>
      <Button variant="outlined" color="primary" onClick={handleClose}>Cancel</Button>
      <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
      <Button variant="outlined" color="primary" onClick={() => removeTask()}>Delete</Button>
    </>
  }

  const formatAndSaveTask = (new_task: TTask, save: ((task: TTask | null, newTask: TTask) => void)) => {
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
    console.log(payload, task, save)
    save(task, payload);
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

  return <>
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={modelStyle}>
        <form ref={taskForm} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); formatAndSaveTask(task, updateTask); handleClose() } }}>
          <Input type="text" defaultValue={task.name} />
          {catSelector()}
        </form>
        {renderControls(
          () => {
            formatAndSaveTask(task, updateTask);
            handleClose()
          },
          () => {
            deleteTask(task);
            handleClose()
          }
        )}
      </Box>
    </Modal>
    <TableCell ><Typography variant='h6'>{task.name ? task.name : 'Your Todo'}</Typography></TableCell>
    <TableCell align="right">
      <Button variant="outlined" color="primary" onClick={handleOpen}>Edit</Button>
      {RenderStatusControls()}
    </TableCell>
  </>
};

export default TaskComponent;
