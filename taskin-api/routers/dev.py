from fastapi import APIRouter
from sqlmodel import delete
from models import Task, Category, StatusEnum, get_session, engine, SessionDep
import uuid

router = APIRouter()
@router.post("/fixtures", include_in_schema=False)
def get_fixtures(session: SessionDep, replace: bool = False, categories: int = 1, tasks: int = 1):
    if replace:
        session.exec(delete(Category))
        session.commit()
    for category in range(categories):
        cat_name = f"Category {uuid.uuid4().hex[:5]}"
        new_category = Category(
            name=cat_name, tasks=[Task(name=f"{cat_name} - T{task}", status=StatusEnum.todo) for task in range(tasks)]
        )
        session.add(new_category)
    session.commit()
