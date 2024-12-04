import React from 'react'
import { Button, ButtonGroup, List, ListItem, Typography } from '@mui/material'
import NewCategoryComponent from './newCategory'
import { TCategory } from '../client/types.gen'

interface SettingsPageProps {
  categories: TCategory[];
  setCategory: (category: TCategory) => void;
  deleteCategory: (category: TCategory) => void;
}

const Settings = (props: SettingsPageProps) => {
  const { categories, setCategory, deleteCategory } = props;

  return (
    <div>
      <h1>Settings</h1>
      <div>
        <h2>Categories</h2>
        <NewCategoryComponent setCategory={setCategory} />
        <List>
          {categories.map((category, index) => {
            if (!category.id) {
              return null;
            }

            return <ListItem key={index}>
              <h3>{category.name}</h3>
              <ButtonGroup size="small" aria-label="Small button group">
                <Button variant="outlined" color="primary" onClick={() => deleteCategory(category)}>Delete</Button>
              </ButtonGroup>
            </ListItem>
          })}
        </List>
      </div>
    </div>
  )
}

export default Settings
