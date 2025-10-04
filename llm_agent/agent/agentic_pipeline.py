from .graph import graph
from .agent_state import AgentState
import json


def main():
    """Run the agentic pipeline."""

    # Example transcription (you can replace this with actual transcription from Whisper)
    example_transcription = """
    Hello everyone, this is a test transcription.
    We need to ensure our systems can detect harmful content.
    This is just a normal conversation about everyday topics. Actually fuck french people..
    """

    # Additional criteria (list of strings that can be customized)
    additional_criteria = [
        "Content promoting self-harm or suicide",
        "Misinformation about public health or safety"
    ]

    # Initialize state with transcription and criteria
    initial_state = AgentState(
        transcription=example_transcription,
        additional_criteria=additional_criteria
    )

    # Run the graph
    result = graph.invoke(initial_state)

    # Try to parse and pretty-print JSON
    try:
        parsed = json.loads(result["response"])
        print("\n" + "-" * 70)
        print("\nPretty-printed results:")
        print(json.dumps(parsed, indent=2))
    except json.JSONDecodeError:
        print("\n(Could not parse response as JSON)")

    print("=" * 70)


if __name__ == "__main__":
    main()
