from langchain_ollama import ChatOllama
import os

# Singleton instance
_llm_instance = None


def get_llm() -> ChatOllama:
    """Get the Ollama LLM instance (singleton)."""
    global _llm_instance
    if _llm_instance is None:
        model_name = os.getenv("OLLAMA_MODEL", "qwen3:8b")
        _llm_instance = ChatOllama(
            model=model_name,
            temperature=0,
            format="json",
            num_ctx=4096,
            num_predict=2048,
            top_p=0.9,
            repeat_penalty=1.1,
            keep_alive="24h"
        )
    return _llm_instance
