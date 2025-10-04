from langgraph.graph import StateGraph, START, END
from .agent_state import AgentState
from .nodes import refine_criteria, content_check_node

# Create the workflow graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("refine_criteria", refine_criteria)
workflow.add_node("content_check", content_check_node)

# Add edges: START -> refine_criteria -> content_check -> END
workflow.add_edge(START, "refine_criteria")
workflow.add_edge("refine_criteria", "content_check")
workflow.add_edge("content_check", END)

# Compile the graph
graph = workflow.compile()
