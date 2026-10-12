import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.database import init_db, get_connection
from backend.models import (
    AgentStatusUpdate, GoalCreate, GoalProgressUpdate,
    MemoryCreate, ChatRequest, WalletUpdate, LightingConfig
)
from backend.memory import OrbMemoryManager
from backend.crew import OrbCrewOrchestrator

app = FastAPI(title="Orb - Virtual Office AI Agent System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: List[WebSocket] = []

async def broadcast_ws(payload: Dict[str, Any]):
    """Broadcasts a payload to all connected clients."""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(payload)
        except Exception:
            disconnected.append(connection)
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)

orchestrator = OrbCrewOrchestrator(broadcast_fn=broadcast_ws)

# In-memory lighting state
current_lighting = {
    "time_of_day": "morning",
    "theme_mode": "light",
    "auto": False
}

@app.on_event("startup")
def on_startup():
    init_db()

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial status snapshot upon connection
        await websocket.send_json({
            "type": "connection_established",
            "lighting": current_lighting
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg_type == "chat":
                    agent_id = msg.get("agent_id", "fin")
                    user_text = msg.get("message", "")
                    # Run turn asynchronously and broadcast
                    asyncio.create_task(handle_chat_turn(agent_id, user_text, websocket))
                elif msg_type == "status_change":
                    await orchestrator.update_agent_status(
                        agent_id=msg.get("agent_id"),
                        status=msg.get("status", "active"),
                        tag_text=msg.get("tag_text", "active"),
                        tag_color=msg.get("tag_color", "#10B981"),
                        description_text=msg.get("description_text")
                    )
            except Exception as e:
                print(f"WS error handling message: {e}")
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

async def handle_chat_turn(agent_id: str, message: str, websocket: WebSocket):
    result = await orchestrator.run_agent_turn(agent_id, message)
    # Broadcast response
    await broadcast_ws({
        "type": "chat_response",
        "agent_id": agent_id,
        "text": result["text"],
        "action": result.get("action")
    })

# REST Endpoints

@app.get("/api/agents")
def get_agents():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents ORDER BY sort_order ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/agents/{agent_id}")
def get_agent_detail(agent_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    agent_row = cursor.fetchone()
    if not agent_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = dict(agent_row)
    
    # Get memories
    memories = OrbMemoryManager.get_agent_memories(agent_id)
    
    # Get recent messages
    cursor.execute("""
    SELECT * FROM chat_messages 
    WHERE agent_id = ? 
    ORDER BY id DESC LIMIT 20
    """, (agent_id,))
    messages = [dict(m) for m in cursor.fetchall()]
    messages.reverse()
    
    # Get assigned goals
    cursor.execute("SELECT * FROM goals WHERE assigned_agent_id = ?", (agent_id,))
    goals = [dict(g) for g in cursor.fetchall()]
    
    conn.close()
    return {
        "agent": agent,
        "memories": memories,
        "messages": messages,
        "goals": goals
    }

@app.post("/api/agents/{agent_id}/status")
async def update_agent_status_endpoint(agent_id: str, body: AgentStatusUpdate):
    await orchestrator.update_agent_status(
        agent_id=agent_id,
        status=body.status,
        tag_text=body.tag_text or body.status,
        tag_color=body.tag_color or "#10B981",
        description_text=body.description_text
    )
    return {"status": "success", "agent_id": agent_id}

@app.get("/api/goals")
def get_goals():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM goals ORDER BY id ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/goals")
async def create_goal(goal: GoalCreate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO goals (title, milestone, progress_pct, completed, assigned_agent_id, category, target_value, current_value, created_at)
    VALUES (?, ?, ?, 0, ?, ?, ?, ?, datetime('now'))
    """, (goal.title, goal.milestone, goal.progress_pct, goal.assigned_agent_id, goal.category, goal.target_value, goal.current_value))
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    await broadcast_ws({"type": "goals_updated"})
    return {"id": goal_id, "status": "created"}

@app.patch("/api/goals/{goal_id}")
async def update_goal(goal_id: int, body: GoalProgressUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    
    updates = ["progress_pct = ?"]
    params = [body.progress_pct]
    
    if body.completed is not None:
        updates.append("completed = ?")
        params.append(body.completed)
    if body.milestone is not None:
        updates.append("milestone = ?")
        params.append(body.milestone)
        
    params.append(goal_id)
    cursor.execute(f"UPDATE goals SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()
    
    await broadcast_ws({"type": "goals_updated", "goal_id": goal_id, "progress_pct": body.progress_pct})
    return {"status": "success"}

@app.get("/api/memory")
def get_memories(agent_id: Optional[str] = None):
    if agent_id:
        return OrbMemoryManager.get_agent_memories(agent_id)
    return OrbMemoryManager.get_all_memories()

@app.post("/api/memory")
async def add_memory_endpoint(mem: MemoryCreate):
    created = OrbMemoryManager.add_memory(
        content=mem.content,
        memory_type=mem.memory_type,
        agent_id=mem.agent_id,
        category=mem.category
    )
    await broadcast_ws({"type": "memory_added", "memory": created})
    return created

@app.get("/api/wallet")
def get_wallet():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM wallet WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"id": 1, "balance": 1400.0, "currency": "USD", "last_transaction": ""}

@app.post("/api/wallet")
async def update_wallet(body: WalletUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    if body.balance is not None:
        cursor.execute("UPDATE wallet SET balance = ? WHERE id = 1", (body.balance,))
    elif body.delta is not None:
        cursor.execute("UPDATE wallet SET balance = balance + ? WHERE id = 1", (body.delta,))
    if body.currency:
        cursor.execute("UPDATE wallet SET currency = ? WHERE id = 1", (body.currency,))
    if body.note:
        cursor.execute("UPDATE wallet SET last_transaction = ? WHERE id = 1", (body.note,))
    conn.commit()
    cursor.execute("SELECT * FROM wallet WHERE id = 1")
    updated = dict(cursor.fetchone())
    conn.close()
    
    await broadcast_ws({"type": "wallet_updated", "wallet": updated})
    return updated

@app.get("/api/talents")
def get_talents():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM talents ORDER BY id ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/collections")
def get_collections():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM collections ORDER BY id ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/chat/history/{agent_id}")
def get_chat_history(agent_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_messages WHERE agent_id = ? ORDER BY id ASC", (agent_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/chat")
async def send_chat(req: ChatRequest):
    result = await orchestrator.run_agent_turn(req.agent_id, req.message)
    await broadcast_ws({
        "type": "chat_response",
        "agent_id": req.agent_id,
        "text": result["text"],
        "action": result.get("action")
    })
    return result

@app.get("/api/lighting")
def get_lighting():
    return current_lighting

@app.post("/api/lighting")
async def set_lighting(cfg: LightingConfig):
    global current_lighting
    current_lighting["time_of_day"] = cfg.time_of_day
    current_lighting["theme_mode"] = cfg.theme_mode
    current_lighting["auto"] = cfg.auto
    await broadcast_ws({"type": "lighting_changed", "lighting": current_lighting})
    return current_lighting

# Mount frontend files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")
app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))
