from uuid import UUID
from annotated_types import T
from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response
from fastapi.routing import APIRoute
from typing import Annotated, Sequence, Callable
from models import (
    Task,
    Category,
    TTask,
    TCategory,
    TaskFull,
    CategoryFull,
    StatusEnum,
    TaskBase,
    CategoryBase,
    engine,
    SessionDep,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, select
import logging
import os

DEBUG = os.environ.get("DEV", "").lower() == "true"

logger = logging.getLogger("uvicorn.error")
app = FastAPI(separate_input_output_schemas=False)


class DevLogger(APIRoute):
    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            logger.info(f"Request: {request.method} - {request.url} body: \n {await request.body()}")
            response: Response = await original_route_handler(request)
            logger.info(f"Response: {response.status_code} - body: \n {response.body}")
            return response

        return custom_route_handler


app.router.route_class = DevLogger


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


if DEBUG:
    origins = ["*"]
else:
    origins = ["http://localhost:3000"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def cast_task_model(source: Task) -> TaskFull:
    task = TaskFull.model_validate(source.model_dump())
    if source.category:
        task.category = CategoryBase.model_validate(source.category.model_dump())
    return task


def cast_category_model(source: Category) -> CategoryFull:
    cat_out = CategoryFull.model_validate(source.model_dump())
    if source.tasks:
        tasks = [TaskBase.model_validate(task) for task in source.tasks]
        cat_out.tasks = tasks
    else:
        cat_out.tasks = []
    return cat_out


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/tasks", operation_id="get_tasks", response_model=Sequence[TTask])
def read_tasks(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> Sequence[TaskFull]:
    tasks = session.exec(select(Task).offset(offset).limit(limit)).all()
    return [cast_task_model(task) for task in tasks]


# @app.get("/tasks/uncategorised", operation_id="get_uncategorised_tasks", response_model=Sequence[TTask])
# def get_uncategorised_tasks(
#     session: SessionDep,
#     offset: int = 0,
#     limit: Annotated[int, Query(le=100)] = 100,
# ) -> Sequence[TaskFull]:
#
#     return [cast_task_model(task) for task in tasks]


@app.post("/tasks", operation_id="create_task", response_model=TTask)
def create_task(task: TTask, session: SessionDep) -> TaskFull:
    db_task = Task.model_validate(task.model_dump(exclude_unset=True, exclude_none=True))

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    print(db_task.model_dump())
    return cast_task_model(db_task)


@app.get("/tasks/by-status/{status}", operation_id="get_task_by_status", response_model=Sequence[TTask])
def get_task_by_status(status: StatusEnum, session: SessionDep) -> Sequence[TaskFull]:
    tasks = session.exec(select(Task).where(Task.status == status)).all()
    return [cast_task_model(task) for task in tasks]


@app.get("/tasks/{task_id}", operation_id="get_task", response_model=TTask)
def get_task(task_id: UUID, session: SessionDep) -> TaskFull:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return cast_task_model(task)


@app.delete("/tasks/{task_id}", operation_id="delete_task", status_code=200)
def delete_task(task_id: UUID, session: SessionDep):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return ""


@app.put("/tasks/{task_id}", operation_id="update_task", response_model=TTask)
def update_task(task_id: UUID, new_task: TTask, session: SessionDep) -> TaskFull:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.sqlmodel_update(new_task.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)
    return cast_task_model(task)


@app.get("/categories", operation_id="get_categories", response_model=Sequence[TCategory])
def read_categories(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> Sequence[CategoryFull]:
    categories = session.exec(select(Category).offset(offset).limit(limit)).all()
    tasks = session.exec(select(Task).where(Task.category_id == None).offset(offset).limit(limit)).all()
    tasks_full = [TaskBase.model_validate(task.model_dump()) for task in tasks]

    return [cast_category_model(category) for category in categories] + [CategoryFull(name="Uncategorised", tasks=tasks_full)]


@app.get("/categories/{category_id}", operation_id="get_category", response_model=TCategory)
def get_category(category_id: UUID, session: SessionDep) -> CategoryFull:
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="category not found")
    return cast_category_model(category)


@app.post("/categories", operation_id="create_category", response_model=TCategory)
def create_category(category: TCategory, session: SessionDep) -> CategoryFull:
    existing = session.exec(select(Category).where(Category.name == category.name)).all()
    print(existing)
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    db_category = Category.model_validate(category.model_dump(exclude_unset=True, exclude_none=True))
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return cast_category_model(db_category)


@app.delete("/categories/{category_id}", operation_id="delete_category")
def delete_category(category_id: UUID, session: SessionDep):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="category not found")
    session.delete(category)
    session.commit()

    return {"deleted": True}


@app.put("/categories/{category_id}", operation_id="update_category", response_model=TCategory)
def update_category(category_id: UUID, new_category: TCategory, session: SessionDep):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="category not found")
    category.sqlmodel_update(new_category.model_dump(exclude_unset=True, exclude_none=True))
    session.add(category)
    session.commit()
    session.refresh(category)
    return cast_category_model(category)

if DEBUG:
    from routers.dev import router as dev_router

    app.router.include_router(dev_router, prefix="/dev")
