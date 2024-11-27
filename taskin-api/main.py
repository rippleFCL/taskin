from fastapi import FastAPI
from models import Task, StatusEnum
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


data = [
    Task(name="test", status=StatusEnum.todo, category="test"),
    Task(name="test1", status=StatusEnum.todo, category="test"),
    Task(name="test2", status=StatusEnum.todo, category="test1"),
    Task(name="test3", status=StatusEnum.comp, category="test1"),
    Task(name="test4", status=StatusEnum.comp, category="test"),
    Task(name="test5", status=StatusEnum.comp, category="test1"),
    Task(name="test6", status=StatusEnum.in_prog, category="test"),
    Task(name="test7", status=StatusEnum.in_prog, category="test1"),

]


@app.get("/tasks")
def com_tasks():
    return data

# @app.delete("/tasks/{category_id}")
# def delete_category(category_id: str):
#     for cat in data:
#         if cat.name == category_id:
#             data.remove(cat)
#             return {"success": True}
#
#     return {"success": False}
#
# @app.put("/tasks/{category_id}")
# def update_category(category_id: str, name: str, tasks: list[Task]):
#     for cat in data:
#         if cat.name == category_id:
#             cat.name = name
#             cat.tasks = tasks
#             return {"success": True}
#
#     return {"success": False}
#
#
# @app.post("/tasks")
# def add_category(category: Category):
#     for cat in data:
#         if cat.name == category.name:
#             return {"success": False}
#     data.append(category)
#     return {"success": True}
