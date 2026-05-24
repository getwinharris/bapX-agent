"""bapX API entry point — re-exports the FastAPI app from backend."""
from backend import app
import agent_orchestrator  # noqa: F401 — ensure orchestrator agents are loaded
