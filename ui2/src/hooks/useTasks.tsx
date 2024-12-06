import { useState, useEffect } from "react";

export const useTasks = () => {
  const [tasks, setTasks] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8080/tasks?offset=0&limit=100", {
      headers: {
        'accept': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((data) => {
        setTasks(data);
      });
  }, []);

  return [tasks, setTasks] as const; // infers [boolean, typeof setApiResponse] instead of (boolean | typeof setApiResponse)[]
}
