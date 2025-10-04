from langgraph.graph import StateGraph, START, END
from .agent_state import AgentState
from .nodes import qwen_node

# Create the workflow graph
workflow = StateGraph(AgentState)

# add the single node
workflow.add_node("qwen_node", qwen_node)

# add edges
workflow.add_edge(START, "qwen_node")
workflow.add_edge("qwen_node", END)

# Compile the graph
graph = workflow.compile()
