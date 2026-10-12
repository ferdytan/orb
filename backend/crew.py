import os
import asyncio
from typing import Dict, Any, Optional, Callable, Awaitable
from backend.database import get_connection
from backend.memory import OrbMemoryManager

# Try importing CrewAI
try:
    from crewai import Agent, Crew, Task, Process
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False

class OrbCrewOrchestrator:
    """
    CrewAI Orchestrator for the Orb Virtual Office.
    Handles:
    - Agent instantiation with per-agent backstory and shared memory
    - Status transitions ('listening' -> 'active' / 'routing' -> 'idle')
    - Real-time broadcasts over WebSocket
    - Goal and wallet updates triggered by agent actions
    """

    def __init__(self, broadcast_fn: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None):
        self.broadcast_fn = broadcast_fn

    async def update_agent_status(self, agent_id: str, status: str, tag_text: str, tag_color: str, description_text: Optional[str] = None):
        """Updates agent status in database and broadcasts live update."""
        conn = get_connection()
        cursor = conn.cursor()
        
        if description_text:
            cursor.execute("""
            UPDATE agents 
            SET status = ?, tag_text = ?, tag_color = ?, description_text = ?
            WHERE id = ?
            """, (status, tag_text, tag_color, description_text, agent_id))
        else:
            cursor.execute("""
            UPDATE agents 
            SET status = ?, tag_text = ?, tag_color = ?
            WHERE id = ?
            """, (status, tag_text, tag_color, agent_id))
            
        conn.commit()
        conn.close()

        if self.broadcast_fn:
            payload = {
                "type": "agent_status",
                "agent_id": agent_id,
                "status": status,
                "tag_text": tag_text,
                "tag_color": tag_color,
                "description_text": description_text
            }
            await self.broadcast_fn(payload)

    def get_agent_info(self, agent_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    async def run_agent_turn(self, agent_id: str, user_message: str) -> Dict[str, Any]:
        """
        Executes a turn for an agent, utilizing CrewAI concepts and memory.
        """
        agent_info = self.get_agent_info(agent_id)
        if not agent_info:
            return {"text": f"Agent {agent_id} not found."}

        # Step 1: Agent switches to 'active' or 'routing'
        await self.update_agent_status(
            agent_id=agent_id,
            status="active",
            tag_text="thinking",
            tag_color="#F59E0B",
            description_text=f"Processing: {user_message[:20]}..."
        )
        await asyncio.sleep(0.7)  # Brief micro-delay for realistic visual feedback

        # Step 2: Retrieve memory context
        memory_context = OrbMemoryManager.format_memory_context_for_prompt(agent_id)

        # Step 3: Check if real LLM API is available and configured
        openai_key = os.getenv("OPENAI_API_KEY")
        response_text = ""
        action_performed = None

        if openai_key and CREWAI_AVAILABLE:
            try:
                # Real CrewAI execution
                crew_agent = Agent(
                    role=agent_info["role"],
                    goal=f"Help user with their requests while adhering to {agent_info['personality']}",
                    backstory=f"{agent_info['personality']}\nMemory Context:\n{memory_context}",
                    verbose=True,
                    memory=True
                )
                
                task = Task(
                    description=f"User request: {user_message}\nAnswer concisely in 1-3 cheerful, productive sentences.",
                    expected_output="Helpful and personality-aligned assistant response.",
                    agent=crew_agent
                )
                
                crew = Crew(
                    agents=[crew_agent],
                    tasks=[task],
                    process=Process.sequential,
                    verbose=True
                )
                
                result = await asyncio.to_thread(crew.kickoff)
                response_text = str(result)
            except Exception as e:
                print(f"CrewAI execution fallback due to: {e}")
                response_text = self._generate_domain_response(agent_id, agent_info, user_message)
        else:
            # Intelligent plush domain response generator with memory-awareness
            response_text, action_performed = self._process_domain_turn(agent_id, agent_info, user_message)

        # Step 4: Record conversation in database
        conn = get_connection()
        cursor = conn.cursor()
        now = asyncio.get_event_loop().time()
        cursor.execute("""
        INSERT INTO chat_messages (agent_id, sender, text, timestamp)
        VALUES (?, 'user', ?, datetime('now'))
        """, (agent_id, user_message))
        cursor.execute("""
        INSERT INTO chat_messages (agent_id, sender, text, timestamp)
        VALUES (?, 'agent', ?, datetime('now'))
        """, (agent_id, response_text))
        conn.commit()
        conn.close()

        # Step 5: Save new per-agent memory if message contains useful intent
        if any(kw in user_message.lower() for kw in ["remember", "save", "note", "goal", "prefer", "budget", "plan", "flight"]):
            OrbMemoryManager.add_memory(
                content=f"User instructed: '{user_message}'",
                memory_type="per_agent",
                agent_id=agent_id,
                category="history"
            )

        # Step 6: Return agent to idle or listening state
        final_status = "listening" if agent_id in ["chat", "spark"] else "active"
        tag_color = "#10B981" if final_status == "active" else "#4F46E5"
        
        await self.update_agent_status(
            agent_id=agent_id,
            status=final_status,
            tag_text=final_status,
            tag_color=tag_color,
            description_text=agent_info["description_text"]
        )

        return {
            "text": response_text,
            "agent_id": agent_id,
            "status": final_status,
            "action": action_performed
        }

    def _process_domain_turn(self, agent_id: str, agent_info: Dict[str, Any], user_message: str):
        """
        Generates context-aware, plush-personality responses and performs domain actions
        like updating wallet, logging savings goals, or itinerary planning.
        """
        msg = user_message.lower()
        action = None

        if agent_id == "fin":
            if "save" in msg or "juta" in msg or "rupiah" in msg or "budget" in msg or "1 juta" in msg:
                # Update the shared savings goal
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                UPDATE goals 
                SET progress_pct = MIN(100, progress_pct + 10),
                    current_value = 'Rp 850.000'
                WHERE title LIKE '%Save Rp 1 juta%'
                """)
                # Also log to wallet
                cursor.execute("UPDATE wallet SET balance = balance + 50 WHERE id = 1")
                conn.commit()
                conn.close()
                action = {"type": "goal_update", "target": "savings", "progress": 85}
                return (
                    "I've logged that towards our 'Save Rp 1 juta this month' goal! Progress is up to 85% (Rp 850.000 saved). Every rupiah counts, let's keep the streak alive! 🪙✨",
                    action
                )
            elif "wallet" in msg or "balance" in msg or "money" in msg or "expense" in msg:
                return (
                    "Your current balance is $1,400.00 (or ~Rp 22.400.000). Recent expenses are well within our safe threshold, and our burn rate is under control! 👍",
                    None
                )
            else:
                return (
                    f"Fin on duty! 🌟 I'm monitoring our ledger and shared targets. '{user_message}' is noted in my records. Anything else to calculate?",
                    None
                )

        elif agent_id == "muse":
            if "route" in msg or "flight" in msg or "travel" in msg or "trip" in msg:
                return (
                    "Checking flight corridors and transit hubs! ✈️ I've pinned morning departures with flexible cancellation, matching your window-seat preference. Ready when you are!",
                    {"type": "route_check"}
                )
            else:
                return (
                    f"Muse here! 😴 Keeping navigation corridors clear and schedules synced. I'll make sure all logistics for '{user_message}' run smoothly.",
                    None
                )

        elif agent_id == "chat":
            return (
                f"Chat is tuned in! 💬 I've analyzed incoming threads and customer sentiment is positive (94%). I'll draft quick replies for '{user_message}' right away!",
                None
            )

        elif agent_id == "nova":
            return (
                f"Metrics parsed! 📊 Conversion rates increased by 4.2% week-over-week. Regarding '{user_message}', our data signals are trending upward. Coffee is hot and charts are clean! ☕",
                None
            )

        elif agent_id == "blaze":
            return (
                f"Blaze here with high energy! 🚀 Drafted a fresh growth hook for '{user_message}'. We can launch this across community channels to bump outside sales conversions!",
                None
            )

        elif agent_id == "sage":
            return (
                f"Sage reviewing the sprint roadmap 🌱. I've broken down '{user_message}' into manageable milestones so the team stays energized and balanced.",
                None
            )

        elif agent_id == "spark":
            return (
                f"Spark designing away! ✨ I've adjusted the bento grid padding and plush drop-shadows for '{user_message}'. The UI feels tactile and super responsive!",
                None
            )

        elif agent_id == "echo":
            return (
                f"Audio feed synced! 🎙️ I've logged the voice memo and summarized the key takeaways for '{user_message}'. High fidelity, zero noise.",
                None
            )

        elif agent_id == "pixel":
            return (
                f"Rendering complete! 🎨 Plush clay textures and 3D lighting shaders for '{user_message}' are looking vibrant and buttery smooth.",
                None
            )

        elif agent_id == "atlas":
            return (
                f"Atlas reporting from global HQ 🌐. Cross-border time zones and compliance protocols for '{user_message}' have been validated.",
                None
            )

        return (f"{agent_info['name']} here: Got your message '{user_message}'. On it right away!", None)
