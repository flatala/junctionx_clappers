from langgraph.graph import StateGraph, START, END
from .agent_state import AgentState
from .nodes import segment_transcription, content_check_node

# Create the workflow graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("segment_transcription", segment_transcription)
workflow.add_node("content_check", content_check_node)

# Add edges: START -> segment_transcription -> content_check -> END
workflow.add_edge(START, "segment_transcription")
workflow.add_edge("segment_transcription", "content_check")
workflow.add_edge("content_check", END)

# Compile the graph
graph = workflow.compile()
