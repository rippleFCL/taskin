import { GetCategoriesResponse, TTask, TCategory } from '../client/types.gen';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Button,
  Collapse,
  Grid2 as Grid,
  List,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { InlineBadge } from '../styles';
import React, { ReactElement, useEffect, useState } from 'react';
import TaskComponent from '../components/Task';
import NewTask from '../components/newTask';
import { BrowserRouter, Route, Routes, useParams, Link } from 'react-router';
import Settings from '../components/Settings';

declare module '@mui/material/Grid2' {
  interface GridPropsVariantOverrides {
    card: true;
  }
}

interface MainPropTypes {
  categories: TCategory[],
  createTask: (newTask: TTask) => void
  updateTask: (task: TTask | null, newTask: TTask) => void
  deleteTask: (task: TTask) => void;
  setCategory: (category: TCategory) => void
  deleteCategory: (category: TCategory) => void
}

const routes = {
  todo: 'todo',
  in_prog: 'wip',
  comp: 'done',
  settings: 'settings'
}

const Home = (props: MainPropTypes): ReactElement => {
  const { categories, createTask, updateTask, deleteTask, setCategory, deleteCategory } = props
  const isMobile = useMediaQuery('(max-width:600px)');
  const [isMenuOpen, setMenuOpen] = useState(!isMobile);
  // const selectedStatus = useParams<{ status: string }>().status ?? 'todo';

  useEffect(() => {
    setMenuOpen(!isMobile)
  }, [isMobile])

  const sumTasks = (filter: string) => {
    let sum = 0;
    for (let i = 0; i < categories.length; i++) {
      sum += categories[i].tasks?.filter(task => task.status === filter).length ?? 0
    }
    return sum;
  }

  const renderTasks = (tasks: TTask[] | undefined | null) => {
    return <List aria-label="simple table">
      {(tasks ?? []).map((task: TTask) => (
        <TaskComponent
          key={task.id}
          task={task}
          updateTask={updateTask}
          createTask={createTask}
          deleteTask={deleteTask}
          categories={categories}
        />
      ))}
    </List>
  }

  const renderCategories = (filter: string) => {
    return <>{categories.map((category: TCategory) => (
      <Accordion key={category.id} defaultExpanded={(category.tasks ?? []).filter(task => task.status === filter).length > 0 ? true : false} expanded={(category.tasks ?? []).filter(task => task.status === filter).length > 0 ? true : false}>
        <AccordionSummary
          aria-controls={"panel-" + category.name + "-content"}
          id={"panel-" + category.name + "-header"}
        >
          {category.name}
        </AccordionSummary>
        <AccordionDetails>
          {renderTasks(category.tasks?.filter(task => task.status === filter))}
        </AccordionDetails>
      </Accordion>
    ))}</>
  }

  const inProgressTasks = () => {
    const tasks = []
    for (let i = 0; i < categories.length; i++) {
      tasks.push(...(categories[i].tasks?.filter((task) => task.status === 'in_prog')) ?? [])
    }
    return tasks
  }

  return (
    <Box>
      <BrowserRouter>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', marginTop: '.25rem' }} >
          <Button sx={{ display: isMobile ? 'initial' : 'none' }} onClick={() => setMenuOpen(!isMenuOpen)}>{isMenuOpen ? 'Close' : 'Open'}</Button>
          <Collapse in={isMenuOpen}>
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
              <Link to={routes.todo} color="info">
                <InlineBadge badgeContent={sumTasks("todo")} color="primary">To Do</InlineBadge>
              </Link>
              <Link to={routes.in_prog} color="info">
                <InlineBadge badgeContent={sumTasks("in_prog")} color="primary">In Progress</InlineBadge>
              </Link>
              <Link to={routes.comp} color="info">
                <InlineBadge badgeContent={sumTasks("comp")} color="primary">Completed</InlineBadge>
              </Link>
              <Link to={routes.settings} color="info">
                Settings
              </Link>
            </Stack>
          </Collapse>
        </Box>
        <Routes>
          <Route path={routes.todo} element={renderCategories('todo')} />
          <Route path={routes.in_prog} element={renderTasks(inProgressTasks())} />
          <Route path={routes.comp} element={renderCategories('comp')} />
          <Route path={routes.settings} element={
            <Settings categories={categories} setCategory={setCategory} deleteCategory={deleteCategory} />} />
        </Routes>
      </BrowserRouter>
      <NewTask categories={categories} createTask={createTask} />
    </Box>
  )
}

export default Home
