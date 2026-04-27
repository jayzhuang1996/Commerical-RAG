import os
from typing import TypedDict, List
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END

# Define the State passed between agents
class AgentState(TypedDict):
    query: str
    context_text: str
    graph_text: str
    research_summary: str
    analyst_insights: str
    final_answer: str

def get_moonshot_llm(temperature=0.3):
    return ChatOpenAI(
        model="moonshot-v1-8k",
        api_key=os.environ.get("MOONSHOT_API_KEY"),
        base_url="https://api.moonshot.ai/v1",
        temperature=temperature
    )

def synthesizer_node(state: AgentState):
    print("🧠 [Synthesizer Agent] Extracting facts, analyzing trends, and drafting final briefing...")
    llm = get_moonshot_llm(temperature=0.3)
    
    prompt = f"""You are an elite podcast analyst. Synthesize the provided transcripts and graph data to answer the user's question clearly.
    
    RULES & TONE:
    1. Structure your answer using Markdown subheadings (`###`), but DO NOT use generic robotic headers like "Executive Summary" or "Core Analysis". Instead, write contextual, dynamic headings related directly to the point (e.g., `### The Shift towards ASI` instead of `### Core Trend 1`).
    2. Write conversationally and fluidly, like a highly intelligent colleague explaining a topic in a well-structured document.
    3. Weave your insights naturally. If sources disagree, point it out casually ("Interestingly, while Lex suggests X, Joe counters that Y...").
    4. You MUST cite sources seamlessly when you mention facts from them using [Source N] tags.
    5. Do not hallucinate. Use ONLY the provided context.
    
    User Query: {state['query']}
    
    --- Foundational Data (Podcast Transcripts) ---
    {state['context_text']}
    
    --- Verified Network Graph ---
    {state['graph_text']}
    
    Now, write the final Executive Briefing:"""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    # Map the output to final_answer (and pass empty strings to others if needed)
    return {"final_answer": response.content}

# Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("synthesizer", synthesizer_node)

workflow.add_edge(START, "synthesizer")
workflow.add_edge("synthesizer", END)

# Compile into a runnable
synthesis_graph = workflow.compile()

def run_synthesis_pipeline(query: str, context_text: str, graph_text: str) -> str:
    """
    Entry point to run the multi-agent pipeline.
    """
    initial_state = {
        "query": query,
        "context_text": context_text,
        "graph_text": graph_text,
        "research_summary": "",
        "analyst_insights": "",
        "final_answer": ""
    }
    
    print("\n" + "="*60 + "\n[INITIATING LANGGRAPH SYNTHESIS PIPELINE]\n" + "="*60)
    final_state = synthesis_graph.invoke(initial_state)
    print("="*60 + "\n")
    
    return final_state['final_answer']
