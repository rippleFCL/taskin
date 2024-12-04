import React, { useRef } from 'react';
import Box from '@mui/material/Box';
import { Input } from '@mui/material';
import { NoReloadButton as Button } from './NoReloadButton';
import { TCategory } from '../client/types.gen';
import Modal from '@mui/material/Modal';
import { modelStyle } from '../styles';


interface NewCategoryProps {
  setCategory: (category: TCategory) => void
}

const NewCategoryComponent: React.FC<NewCategoryProps> = (props) => {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { setCategory } = props;
  const taskForm = useRef<HTMLFormElement>(null);
  //
  //
  //
  //
  //
  const saveCategory = () => {
    if (!taskForm.current) {
      console.warn('Form not found');
      return;
    }
    const catName = taskForm.current.querySelector('input')?.value
    if (!catName) {
      console.warn('Category name not set');
      return;
    }
    const payload: TCategory = {
      id: null,
      name: catName,

    }
    setCategory(payload);
    handleClose();
  }
  //
  return <>
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={modelStyle}>
        <h1>New Category</h1>
        <form ref={taskForm} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveCategory(); } }}>
          <Input type="text" />
        </form>
        <Button variant="outlined" color="primary" onClick={saveCategory}>Save</Button>
      </Box>
    </Modal>
    <Box p={1} m={1}>
      <Button variant="outlined" color="primary" onClick={handleOpen}>New Category</Button>

      {/* {renderControls(
            () => {
              formatAndSaveTask({
                id: null,
                name: "default",
                status: "todo",
                category_id: null
              }, createTask);
            },
            () => { }
          )} */}
    </Box>
  </>


};

export default NewCategoryComponent;
