import React, { useState, useEffect, ReactElement } from 'react'

interface HomePropTypes {
  todos: TodoItem[]
}

enum StatusEnum {
  todo = "todo",
  comp = "comp",
  in_prog = "in_prog"
}

interface TodoItem {
  name: string
  status: StatusEnum
  category: string
}


const Home = (props: HomePropTypes): ReactElement => {
  console.log(props)
  return (
    <div>
      {props.todos.map((category, index) => (
        <div key={index}>
          <h2>{category.name}</h2>
          <button>Edit</button>
          <ul>
            {category.tasks.map((item, idx) => (
              <li key={idx}>
                {item.name} - {item.status}
                <button>Edit</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default Home
