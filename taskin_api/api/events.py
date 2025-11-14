import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import get_db, Event
from schemas import EventResponse

router = APIRouter()

class EventTriggerResponse(BaseModel):
    message: str

@router.get("/event-list", response_model=list[EventResponse])
def get_event_list(db: Session = Depends(get_db)):
    """Get a list of all events"""
    events = db.query(Event).all()
    return events

@router.post("/events/{event_name}", response_model=EventTriggerResponse)
def trigger_event(event_name: str, db: Session = Depends(get_db), timestamp: datetime.datetime | None = Query(None)):
    """Trigger an event by name"""

    event = db.query(Event).filter(Event.name == event_name).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if timestamp:
        event.timestamp = timestamp
    else:
        event.timestamp = datetime.datetime.now()
    db.commit()
    db.refresh(event)
    # Here you would add logic to handle the event triggering
    return EventTriggerResponse(message=f"Event '{event_name}' triggered successfully. event timestamp set to {event.timestamp}")
