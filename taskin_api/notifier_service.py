"""
Background notifier service that monitors recommended todos and sends webhook notifications
when the recommended list changes despite task statuses remaining unchanged.
"""

import asyncio
import hashlib
import json
import time
from typing import Set

import requests
import structlog
from api.todos import get_recommended_todos
from config_loader import CONFIG
from models import Todo, get_db
from pydantic import HttpUrl
from sqlalchemy.orm import Session


class RecommendedTodosNotifier:
    """
    Monitors recommended todos and sends notifications when they change
    without task statuses changing.
    """

    def __init__(self, webhook_url: HttpUrl | None, check_interval: int = 1):
        self.logger = structlog.stdlib.get_logger().bind(module="notifier_service")
        self.webhook_url = str(webhook_url) if webhook_url else None
        self.check_interval = check_interval
        self.last_task_states_hash: str | None = None
        self.last_recommended_todo_ids: Set[int] | None = None
        self.running = False

    def _compute_task_states_hash(self, db: Session) -> str:
        """
        Compute a hash of all task statuses to detect when any task status changes.
        """
        todos = db.query(Todo).order_by(Todo.id).all()
        state_data = [(todo.id, todo.status.value) for todo in todos]
        state_json = json.dumps(state_data, sort_keys=True)
        return hashlib.sha256(state_json.encode()).hexdigest()

    def _get_recommended_todo_ids(self, db: Session) -> Set[int]:
        """
        Get the set of currently recommended todo IDs.
        """
        try:
            recommended = get_recommended_todos(db=db)
            return {todo.id for todo in recommended}
        except Exception as e:
            self.logger.error("Failed to get recommended todos", error=str(e))
            return set()

    def _send_webhook_notification(self):
        """
        Send a webhook notification about the recommended todos change.
        """
        self.logger.info("Recommended list changed, sending notification")
        payload = {"event": "recommended_todos_changed"}

        try:
            if self.webhook_url:
                response = requests.post(
                    self.webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10,
                )
                response.raise_for_status()

        except requests.exceptions.RequestException as e:
            self.logger.error(
                "Failed to send webhook notification",
                error=str(e),
                webhook_url=self.webhook_url,
            )

    async def check_and_notify(self):
        """
        Check if recommended todos changed without task statuses changing,
        and send a notification if so.
        """
        db = next(get_db())
        try:
            # Compute current task states hash
            current_task_states_hash = self._compute_task_states_hash(db)

            # Get current recommended todo IDs
            current_recommended_todo_ids = self._get_recommended_todo_ids(db)

            # Check if this is the first run
            if self.last_task_states_hash is None:
                self.logger.info(
                    "Initial check - establishing baseline",
                    task_states_hash=current_task_states_hash,
                    recommended_count=len(current_recommended_todo_ids),
                )
                self.last_task_states_hash = current_task_states_hash
                self.last_recommended_todo_ids = current_recommended_todo_ids
                return

            # Check if task statuses changed
            task_statuses_changed = (
                current_task_states_hash != self.last_task_states_hash
            )

            # Check if recommended todos changed
            recommended_changed = (
                current_recommended_todo_ids != self.last_recommended_todo_ids
            )

            if recommended_changed and not task_statuses_changed:
                self._send_webhook_notification()

            # Update state for next check
            self.last_task_states_hash = current_task_states_hash
            self.last_recommended_todo_ids = current_recommended_todo_ids

        except Exception as e:
            self.logger.error(
                "Error during check_and_notify", error=str(e), exc_info=True
            )
        finally:
            db.close()

    async def run(self):
        """
        Main loop - check and notify every check_interval seconds.
        """
        self.running = True
        self.logger.info(
            "Starting notifier service",
            check_interval=self.check_interval,
            webhook_url=self.webhook_url or "Not configured",
        )
        last_run = time.time()
        while self.running:
            await asyncio.sleep(1)
            if self.check_interval < time.time() - last_run:
                await self.check_and_notify()
                last_run = time.time()

    def stop(self):
        """Stop the notifier service."""
        self.logger.info("Stopping notifier service")
        self.running = False


# Global notifier instance
notifier = RecommendedTodosNotifier(CONFIG.notification_webhook_url)
