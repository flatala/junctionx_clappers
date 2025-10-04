from langchain_ollama import ChatOllama


def get_llm() -> ChatOllama:
    """Get the Ollama Qwen LLM instance."""
    llm = ChatOllama(
        model="qwen3:8b",
        temperature=0,
        format="json"  # Request JSON output
    )
    return llm
