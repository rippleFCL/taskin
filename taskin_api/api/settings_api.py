from fastapi import APIRouter, Depends, HTTPException
from models import get_db
from pydantic import BaseModel
from settings import SettingsConfig
from sqlalchemy.orm import Session

router = APIRouter()

DEAD_VALUE_MIN = 1
DEAD_VALUE_MAX = 10


class DeadValueResponse(BaseModel):
    dead_value: int


class DeadValueUpdate(BaseModel):
    dead_value: int


def get_settings_config(db: Session = Depends(get_db)) -> SettingsConfig:
    """Dependency to provide a SettingsConfig bound to the current DB session."""
    return SettingsConfig(db)


@router.get("/settings/dead-value", response_model=DeadValueResponse)
def get_dead_value(
    settings: SettingsConfig = Depends(get_settings_config),
) -> DeadValueResponse:
    """Get the current DEAD_VALUE setting.

    Returns the stored integer value, or the default if not yet set.
    """

    return DeadValueResponse(dead_value=int(settings.dead_value))


@router.put("/settings/dead-value", response_model=DeadValueResponse)
def update_dead_value(
    payload: DeadValueUpdate,
    settings: SettingsConfig = Depends(get_settings_config),
) -> DeadValueResponse:
    """Update the DEAD_VALUE setting.

    Persists the new value in the settings table and returns it.
    """
    try:
        if not (DEAD_VALUE_MIN <= payload.dead_value <= DEAD_VALUE_MAX):
            raise ValueError(
                f"DEAD_VALUE must be between {DEAD_VALUE_MIN} and {DEAD_VALUE_MAX}"
            )
        settings.dead_value = int(payload.dead_value)
    except ValueError as exc:  # defensive, in case of invalid conversions later
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DeadValueResponse(dead_value=int(settings.dead_value))
