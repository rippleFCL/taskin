import os

import yaml
from pydantic import BaseModel, Field, HttpUrl, ValidationError


class WarningValueConfig(BaseModel):
    threshold: int
    message: str


class WarningDataConfig(BaseModel):
    info_message: str
    warning: WarningValueConfig
    critical: WarningValueConfig
    webhook_url: HttpUrl


class WarningConfig(BaseModel):
    weekly: WarningDataConfig
    daily: WarningDataConfig


class TimeDependency(BaseModel):
    start: int | None = None
    end: int | None = None


class ComputeTimeConfig(BaseModel):
    name: str
    src_event: str
    end_time: int
    sections: int
    minimum_window: int
    offset_seconds: int = 0


class ComputeTimeDependency(BaseModel):
    name: str
    index: int


class TodoConfig(BaseModel):
    title: str
    description: str | None = None
    depends_on_todos: list[str] = Field(default_factory=list)
    depends_on_categories: list[str] = Field(default_factory=list)
    depends_on_all_oneoffs: bool = False
    depends_on_time: TimeDependency = TimeDependency()
    depends_on_events: dict[str, TimeDependency] = Field(default_factory=dict)
    depends_on_compute_times: list[ComputeTimeDependency] = Field(default_factory=list)
    reset_interval: int = 1  # Reset every N days (1 = daily)


class CategoryConfig(BaseModel):
    name: str
    description: str | None = None
    todos: list[TodoConfig] = Field(default_factory=list)


class OneOffTodoConfig(BaseModel):
    depends_on_todos: list[str] = Field(default_factory=list)
    depends_on_categories: list[str] = Field(default_factory=list)


class AppConfig(BaseModel):
    notification_webhook_url: HttpUrl | None = None
    webhook_url: HttpUrl | None = None
    warning: WarningConfig | None = None
    categories: list[CategoryConfig] = Field(default_factory=list)
    oneoff_deps: OneOffTodoConfig = Field(default_factory=OneOffTodoConfig)
    computed_times: list[ComputeTimeConfig] = Field(default_factory=list)


_CONFIG_PATH: str = "config.yml"


def init_config(config_path: str = "config.yml") -> AppConfig:
    """Load and validate configuration once and cache it in memory."""
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            raw = yaml.safe_load(f)
    else:
        raw = {}
    try:
        config = AppConfig.model_validate(raw)
        return config
    except ValidationError as e:
        raise ValueError(f"Invalid configuration in {config_path}: {e}")


CONFIG = init_config(_CONFIG_PATH)

WEBHOOK_URL = str(CONFIG.webhook_url)
