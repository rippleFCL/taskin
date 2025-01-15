from os import environ
from sqlmodel import create_engine, Session
from fastapi import Depends
from typing import Annotated

sqlite_file_name = environ.get("DB_PATH", "database.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]
