import asyncio
import os
import sys

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def test_2025():
    from src.agent.reasoning_agent import run_intelligence_briefing
    
    query = "tell me something about 2025"
    filters = {"quarters": [], "layers": []}
    
    print(f"Testing Query: {query}")
    answer = await run_intelligence_briefing(query, filters)
    print("\n--- ANSWER ---")
    print(answer)

if __name__ == "__main__":
    asyncio.run(test_2025())
