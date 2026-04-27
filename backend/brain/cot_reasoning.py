"""
cot_reasoning.py — Financial Chain-of-Thought reasoning builder (Brain Layer).

Assembles the OpenAI-compatible message list that is passed to the LLM engine,
combining system instructions (role / output format) with the structured
user prompt produced by prompt_builder.
"""

from typing import Any, Dict, List


def build_forecast_messages(
    system_prompt: str,
    user_prompt: str,
) -> List[Dict[str, str]]:
    """
    Assemble the message list for the Market Forecast Agent.

    The conversation follows a standard CoT pattern:
      system  → role + output format constraints
      user    → data + step-by-step reasoning instructions
    """
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_report_messages(
    system_prompt: str,
    user_prompt: str,
) -> List[Dict[str, str]]:
    """
    Assemble the message list for the Annual Report Agent.

    Same two-turn structure; system enforces prose style + word count,
    user supplies all financial data and section requirements.
    """
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_generic_reasoning_messages(
    task_description: str,
    data_context: str,
    output_format: str,
) -> List[Dict[str, str]]:
    """
    Generic Chain-of-Thought builder for ad-hoc agent extensions.

    Wraps any task description + data context into a structured CoT prompt.
    This function makes it trivial to add new agents without duplicating
    prompt assembly logic.

    Args:
        task_description: What the LLM must accomplish.
        data_context:     Raw or structured data the LLM should reason over.
        output_format:    Expected output format description (JSON schema, prose, etc.).

    Returns:
        OpenAI-compatible message list.
    """
    system_content = (
        "You are an expert financial analyst. "
        "Think step-by-step before giving your final answer. "
        f"Output format requirement: {output_format}"
    )
    user_content = (
        f"Task: {task_description}\n\n"
        f"Data:\n{data_context}\n\n"
        "Reason step by step, then produce your output."
    )
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]
