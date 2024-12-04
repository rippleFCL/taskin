from email.policy import HTTP
import faker
from fastapi import APIRouter, HTTPException
from sqlmodel import delete
from models import Task, Category, StatusEnum, get_session, engine, SessionDep
import uuid
import os
DEBUGING = os.environ.get("DEV", "").lower() == "true"

def prepare_faker():
    if DEBUGING:
        from faker import Faker
        from faker.providers import DynamicProvider
        medical_professions_provider = DynamicProvider(
            provider_name="status",
            elements=[StatusEnum.todo, StatusEnum.in_prog, StatusEnum.comp],
        )

        faker = Faker()
        faker.add_provider(medical_professions_provider)
        return faker

router = APIRouter()
@router.post("/fixtures", include_in_schema=False)
def get_fixtures(session: SessionDep, replace: bool = False, categories: int = 1, tasks: int = 1):
    faker = prepare_faker()
    if not faker:
        return HTTPException(status_code=400, detail="you arnt in dev mode how the hell did you even hit this endpoint???")
    if replace:
        session.exec(delete(Category))
        session.commit()
    for category in range(categories):
        cat_name = faker.text(max_nb_chars=30)
        new_category = Category(
            name=cat_name, tasks=[Task(name=faker.text(max_nb_chars=30), status=faker.status()) for task in range(tasks)]
        )
        session.add(new_category)
    session.commit()
