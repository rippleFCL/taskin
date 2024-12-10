import React, { useEffect } from 'react'
import './App.css'
import { Home } from './pages/Home'
import './i18n/config'
import { useStore, useCategories} from './store'

const App = () => {
  const categories = useStore((state: any) => state.categories)
  const title: string = useStore((state: any) => state.title)

  return (
    <>
     <h1>{title}</h1>
     <Home />
    </>
  )
}

export default App
