import uvicorn
import os
import sys

if __name__ == "__main__":
    print("==================================================")
    print("  ORB - Virtual Office AI Agent System (CrewAI)   ")
    print("==================================================")
    print("Starting FastAPI backend on http://127.0.0.1:8000")
    print("Press Ctrl+C to stop.")
    
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
