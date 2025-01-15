import React from 'react'
import { useStore } from '../store'
import { ITask } from '../types'
import { useTranslation } from 'react-i18next';

interface ITaskProps {
  task: ITask
}

export const Task = ({ task }: ITaskProps): JSX.Element => {
  const { t } = useTranslation();
  const removeTask = useStore((state) => state.removeTask)
  const updateTask = useStore((state) => state.updateTask)

  return (
    <div>
      <h3>{task.name}</h3>
      <button onClick={removeTask(task.id)}>
        {t('task.delete')}
      </button>
      <button onClick={updateTask({ ...task, name: 'Updated' })}>
        {t('task.update')}
      </button>
    </div>
  )
}
