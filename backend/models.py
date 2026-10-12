from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AgentBase(BaseModel):
    id: str
    name: str
    role: str
    domain: str
    status: str
    tag_text: str
    tag_color: str
    description_icon: str
    description_text: str
    avatar_image: str
    personality: str
    color_theme: str
    sort_order: int

class AgentStatusUpdate(BaseModel):
    status: str
    tag_text: Optional[str] = None
    tag_color: Optional[str] = None
    description_text: Optional[str] = None

class GoalBase(BaseModel):
    id: Optional[int] = None
    title: str
    milestone: str
    progress_pct: int = 0
    completed: int = 0
    assigned_agent_id: Optional[str] = None
    category: str = "General"
    target_value: Optional[str] = None
    current_value: Optional[str] = None
    created_at: Optional[str] = None

class GoalCreate(BaseModel):
    title: str
    milestone: str
    progress_pct: int = 0
    assigned_agent_id: Optional[str] = None
    category: str = "General"
    target_value: Optional[str] = None
    current_value: Optional[str] = None

class GoalProgressUpdate(BaseModel):
    progress_pct: int
    completed: Optional[int] = None
    milestone: Optional[str] = None

class MemoryItem(BaseModel):
    id: Optional[int] = None
    agent_id: Optional[str] = None
    memory_type: str  # 'per_agent' or 'shared'
    category: str     # 'preference', 'history', 'goal', 'note'
    content: str
    created_at: Optional[str] = None

class MemoryCreate(BaseModel):
    agent_id: Optional[str] = None
    memory_type: str = "per_agent"
    category: str = "note"
    content: str

class ChatMessage(BaseModel):
    id: Optional[int] = None
    agent_id: str
    sender: str
    text: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    agent_id: str
    message: str
    use_crew: bool = True

class WalletUpdate(BaseModel):
    delta: Optional[float] = None
    balance: Optional[float] = None
    currency: Optional[str] = None
    note: Optional[str] = None

class LightingConfig(BaseModel):
    time_of_day: str  # 'morning', 'noon', 'evening', 'night'
    theme_mode: str   # 'light', 'dark'
    auto: bool = False
