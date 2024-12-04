import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Input, Select } from '@mui/material';
import { NoReloadButton as Button } from './NoReloadButton';
import { TTask, StatusEnum, TCategory } from '../client/types.gen';
import Modal from '@mui/material/Modal';
import { modelStyle, fabStyle } from '../styles';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';


interface NewTask {
  categories: TCategory[]
  createTask: (newTask: TTask) => void
}

const NewTask: React.FC<NewTask> = (props) => {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { categories, createTask } = props;
  const taskForm = useRef<HTMLFormElement>(null);
  //
  //
  //
  //
  //
  const saveTask = () => {
    if (!taskForm.current) {
      console.warn('Form not found');
      return;
    }

    const taskName = taskForm.current.querySelector('input')?.value
    const catId = taskForm.current?.querySelector('select')?.value
    if(!taskName) {
      return console.log('No task name');
    }
    console.log(catId)
    const payload: TTask = {
      id:  null,
      status: "todo",
      category_id: (catId === "" ? null : catId),
      name: taskName
    }

    createTask(payload);
    handleClose();
  }
  //
  const catSelector = () => {
    return <>{
      props.categories ?
        <Select native defaultValue={""}>
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
        <h1>New Task</h1>
        <form ref={taskForm} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTask; handleClose} }}>
          <Input type="text" />
          {catSelector()}
        </form>
        <Button variant="outlined" color="primary" onClick={handleClose}>Cancel</Button>
        <Button variant="outlined" color="primary" onClick={saveTask}>Save</Button>
      </Box>
    </Modal>
    <Fab sx={fabStyle} color="secondary" aria-label="add" onClick={handleOpen}>
      <AddIcon />
    </Fab>
  </>


};

export default NewTask;
