from enum import Enum

from fastapi import Depends
from models import Settings, get_db
from sqlalchemy.orm import Session


class SettingsEnum(Enum):
    DEAD_VALUE = "dead_value"


DEFAULTS = {
    SettingsEnum.DEAD_VALUE: "10",
}


class SettingsConfig:
    def __init__(
        self, db_session: Session, defaults: dict[SettingsEnum, str] = DEFAULTS
    ):
        self.db_session = db_session
        self.defaults = defaults

    @property
    def dead_value(self) -> float:
        data = (
            self.db_session.query(Settings)
            .filter(Settings.key == SettingsEnum.DEAD_VALUE.value)
            .first()
        )
        if data is None:
            return float(self.defaults[SettingsEnum.DEAD_VALUE])
        return float(data.value)

    @dead_value.setter
    def dead_value(self, value: float | int):
        setting = (
            self.db_session.query(Settings)
            .filter(Settings.key == SettingsEnum.DEAD_VALUE.value)
            .first()
        )
        if value < 1:
            value = 1
        elif value > 10:
            value = 10
        if setting:
            setting.value = str(value)
        else:
            setting = Settings(key=SettingsEnum.DEAD_VALUE.value, value=str(value))
            self.db_session.add(setting)
        self.db_session.commit()


def get_settings_config(db: Session = Depends(get_db)) -> SettingsConfig:
    """Dependency to provide a SettingsConfig bound to the current DB session."""
    return SettingsConfig(db)
