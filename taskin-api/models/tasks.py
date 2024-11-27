from pydantic import BaseModel
from enum import Enum

class StatusEnum(str, Enum):
    todo = "todo"
    comp = "comp"
    in_prog = "in_prog"

class Task(BaseModel):
    name: str
    status: StatusEnum
    category: str
