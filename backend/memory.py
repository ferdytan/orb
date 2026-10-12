from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.database import get_connection

class OrbMemoryManager:
    """
    CrewAI Memory System Bridge for Orb.
    Manages:
    - Per-agent memory: personal preferences, role history, agent-specific goals
    - Shared memory: global goals accessible by all agents (e.g. 'Save Rp 1 juta this month')
    """

    @staticmethod
    def add_memory(
        content: str,
        memory_type: str = "per_agent",
        agent_id: Optional[str] = None,
        category: str = "note"
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        cursor.execute("""
        INSERT INTO memories (agent_id, memory_type, category, content, created_at)
        VALUES (?, ?, ?, ?, ?)
        """, (agent_id if memory_type == "per_agent" else None, memory_type, category, content, now))
        
        memory_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "id": memory_id,
            "agent_id": agent_id if memory_type == "per_agent" else None,
            "memory_type": memory_type,
            "category": category,
            "content": content,
            "created_at": now
        }

    @staticmethod
    def get_agent_memories(agent_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT * FROM memories 
        WHERE (agent_id = ? AND memory_type = 'per_agent') OR memory_type = 'shared'
        ORDER BY id DESC
        """, (agent_id,))
        
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_shared_memories() -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT * FROM memories 
        WHERE memory_type = 'shared'
        ORDER BY id DESC
        """)
        
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_all_memories() -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM memories ORDER BY id DESC")
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def format_memory_context_for_prompt(agent_id: str) -> str:
        """
        Builds a structured contextual prompt inject containing shared memories
        and per-agent memories for CrewAI prompt enhancement.
        """
        memories = OrbMemoryManager.get_agent_memories(agent_id)
        
        shared_items = [m["content"] for m in memories if m["memory_type"] == "shared"]
        agent_items = [m["content"] for m in memories if m["memory_type"] == "per_agent"]
        
        context_parts = []
        if shared_items:
            context_parts.append("### SHARED CREW MEMORY (Global Goals & Rules):")
            for item in shared_items:
                context_parts.append(f"- {item}")
                
        if agent_items:
            context_parts.append(f"\n### PER-AGENT MEMORY FOR {agent_id.upper()} (Personal Preferences & History):")
            for item in agent_items:
                context_parts.append(f"- {item}")
                
        return "\n".join(context_parts)
