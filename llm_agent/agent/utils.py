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
            format="json",  # Request JSON output
            num_ctx=4096,  # Context window size
            num_predict=2048,  # Max tokens to generate
            top_p=0.9,  # Nucleus sampling
            repeat_penalty=1.1,  # Penalize repetitions
        )
    return _llm_instance
