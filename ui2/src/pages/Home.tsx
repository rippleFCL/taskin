import React, { useEffect } from 'react'
import { useStore } from '../store'
import { ICategory } from '../types'
import { Category } from '../components/Category'
import { useTranslation } from 'react-i18next'

export const Home = () => {
  const { t } = useTranslation()
  const categories: ICategory[] = useStore((state) => state.categories)
  const tasks: any = useStore((state) => state.tasks)
  const setTitle = useStore((state) => state.setTitle)

  useEffect(() => {
    setTitle(t('homepage.title'))
  }, [])

  return (
    <div>
      {categories.length !== 0 ? categories.map((category: ICategory) => (
          <Category key={category.id} category={category} />
        )) : <div>{t('category.none_found')}</div>}

      {tasks.length !== 0 ? tasks.map((task: any) => (
        <div key={task.id}>{task.name}</div>
      )) : <div>{t('task.none_found')}</div>}
    </div>
  )
}
