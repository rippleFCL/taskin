import React from 'react'
import { useStore } from '../store'
import { ICategory } from '../types'
import { useTranslation } from 'react-i18next'

interface ICategoryProps {
  category: ICategory
}

export const Category = ({ category }: ICategoryProps) => {
  const { t } = useTranslation()
  const removeCategory = useStore((state) => state.removeCategory)
  const updateCategory = useStore((state) => state.updateCategory)

  return (
    <div>
      <h2>{category.name}</h2>
      <button onClick={() => removeCategory(category.id)}>{t('category.delete')}</button>
      <button onClick={() => updateCategory({ ...category, name: 'Updated' })}>{t('category.update')}</button>
      <ul>
        {/* {getTasksByCategory(category.id).map((task) => (
          <li key={task.id}>{task.name}</li>
        ))} */}
      </ul>
    </div>
  )
}
