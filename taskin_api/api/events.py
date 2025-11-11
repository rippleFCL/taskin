import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import get_db, Event

router = APIRouter()

class EventTriggerResponse(BaseModel):
    message: str

@router.post("/events/{event_name}", response_model=EventTriggerResponse)
def trigger_event(event_name: str, db: Session = Depends(get_db)):
    """Trigger an event by name"""
    event = db.query(Event).filter(Event.name == event_name).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.timestamp = datetime.datetime.now()
    db.commit()
    # Here you would add logic to handle the event triggering
    return EventTriggerResponse(message=f"Event '{event_name}' triggered successfully.")
