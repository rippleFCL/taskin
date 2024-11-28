from uuid import UUID
from annotated_types import T
from fastapi import FastAPI, Depends, HTTPException, Query
from typing import Annotated, Sequence
from models import Task, Category, TaskSet, CategorySet, CategoryResponse, TaskResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import create_engine, Session, SQLModel, select

app = FastAPI()


sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


SessionDep = Annotated[Session, Depends(get_session)]


origins = ["http://localhost", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/tasks", operation_id="get_tasks", response_model=Sequence[TaskResponse])
def read_tasks(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> Sequence[Task]:
    tasks = session.exec(select(Task).offset(offset).limit(limit)).all()
    return tasks


@app.post("/tasks", operation_id="create_task", response_model=TaskResponse)
def create_task(task: TaskSet, session: SessionDep) -> Task:
    db_task = Task.model_validate(task)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}", operation_id="delete_task")
def delete_task(task_id: str, session: SessionDep):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return {"deleted": True}


@app.put("/tasks/{task_id}", operation_id="update_task", response_model=TaskResponse)
def update_task(task_id: UUID, new_task: TaskSet, session: SessionDep) -> Task:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.sqlmodel_update(new_task.model_dump(exclude_unset=True))
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.get("/categories", operation_id="get_categories", response_model=Sequence[CategoryResponse])
def read_categories(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> Sequence[Category]:
    categories = session.exec(select(Category).offset(offset).limit(limit)).all()
    return categories


@app.post("/categories", operation_id="create_category", response_model=CategoryResponse)
def create_category(category: CategorySet, session: SessionDep) -> Category:
    db_category = Category.model_validate(category)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


@app.delete("/categories/{category_id}", operation_id="delete_category")
def delete_category(category_id: str, session: SessionDep):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="category not found")
    session.delete(category)
    session.commit()

    return {"deleted": True}


@app.put("/categories/{category_id}", operation_id="update_category", response_model=CategoryResponse)
def update_category(category_id: str, new_category: CategorySet, session: SessionDep):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="category not found")
    category.sqlmodel_update(new_category.model_dump(exclude_unset=True))
    session.add(category)
    session.commit()
    session.refresh(category)
    return category
