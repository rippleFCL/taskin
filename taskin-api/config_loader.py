import os
from typing import List, Optional

import yaml
from pydantic import BaseModel, Field, HttpUrl, ValidationError


class TodoConfig(BaseModel):
    title: str
    description: Optional[str] = None
    depends_on_todos: List[str] = Field(default_factory=list)
    depends_on_categories: List[str] = Field(default_factory=list)
    depends_on_all_oneoffs: bool = False
    reset_interval: int = 1  # Reset every N days (1 = daily)


class CategoryConfig(BaseModel):
    name: str
    description: Optional[str] = None
    todos: List[TodoConfig] = Field(default_factory=list)


class AppConfig(BaseModel):
    webhook_url: Optional[HttpUrl] = None
    base_uri: Optional[HttpUrl] = None
    categories: List[CategoryConfig] = Field(default_factory=list)


CONFIG: Optional[AppConfig] = None
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
UI_URI = str(CONFIG.base_uri)
