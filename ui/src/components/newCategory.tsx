import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { Button, Input, Select } from '@mui/material';
import { TaskMode } from '../types';
import { TTask, StatusEnum, TCategory } from '../client/types.gen';

interface NewCategoryProps {
  setCategory: (category: TCategory) => void
}

const NewCategoryComponent: React.FC<NewCategoryProps> = (props) => {
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
    }
  //
      return (
        <Box p={1} m={1}>
          <h1>New Category</h1>
          <form ref={taskForm}>
            <Input type="text" />

          </form>
          <Button variant="outlined" color="primary" onClick={saveCategory}>Save</Button>
          {/* {renderControls(
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
          )} */}
      </Box>
      );
  //

};

export default NewCategoryComponent;
