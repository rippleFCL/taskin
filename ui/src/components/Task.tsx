import React, { useEffect, useRef, useState } from 'react';
import { NoReloadButton as Button } from './NoReloadButton';
import { TTask, StatusEnum, TCategory } from '../client/types.gen';
import { modelStyle } from "../styles";
import { Typography, ButtonGroup, Modal, Input, Select, useMediaQuery, ListItem } from '@mui/material';
import Box from '@mui/material/Box';

interface TaskProps {
  createTask: (task: TTask | null, newTask: TTask) => void;
  updateTask: (task: TTask | null, newTask: TTask) => void;
  deleteTask: (task: TTask) => void;
  task: TTask;
  categories: TCategory[] | undefined;
}

const TaskComponent: React.FC<TaskProps> = (props) => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { task, createTask, updateTask, deleteTask } = props;
  const taskForm = useRef<HTMLFormElement>(null);
  const isMobile = useMediaQuery('(max-width:600px)');

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
      "todo": "Start",
      "in_prog": "Complete",
      "comp": "Reset"
    }

    return <Button variant="outlined" color="primary" onClick={() => statusProgression()}>{statusMaping[task.status]}</Button>
  }
  const renderControls = (save: () => void, removeTask: () => void) => {
    return <ButtonGroup size="small" aria-label="Small button group" orientation={isMobile ? 'vertical': 'horizontal'}>
      <Button variant="outlined" color="primary" onClick={handleClose}>Cancel</Button>
      <Button variant="outlined" color="primary" onClick={() => save()}>Save</Button>
      <Button variant="outlined" color="primary" onClick={() => removeTask()}>Delete</Button>
    </ButtonGroup>
  }

  const formatAndSaveTask = (new_task: TTask, save: ((task: TTask | null, newTask: TTask) => void)) => {
    if (!taskForm.current) {
      console.warn('Form not found');
      return;
    }
    const catId = taskForm.current?.querySelector('select')?.value
    const payload: TTask = {
      ...new_task,
      id: new_task.id ?? null,
      status: new_task.status ?? "todo",
      category_id: (catId === "" ? null : catId),
      name: taskForm.current?.querySelector('input')?.value ?? new_task.name,
    }
    save(task, payload);
  }

  const catSelector = () => {
    return <>{
      props.categories ?
        <Select native defaultValue={task?.category_id ?? ""}>
          {props.categories?.map((category: TCategory) => (
            <option key={category.id} value={category.id ? category.id : ""} >{category.name}</option>
          ))}
        </Select> : null
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
    <ListItem secondaryAction={
      <ButtonGroup>
        <Button variant="outlined" color="primary" onClick={handleOpen}>Edit</Button>
        {RenderStatusControls()}
      </ButtonGroup>
    }>
      {task.name ? task.name : 'Your Todo'}
    </ListItem>
  </>
};

export default TaskComponent;
