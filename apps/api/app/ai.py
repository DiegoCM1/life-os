"""AI weekly analysis via OpenRouter (OpenAI-compatible API).

Generates the frozen per-week note and the rolling cycle-patterns synthesis for
the 12 Week Year review. Uses the `openai` SDK pointed at OpenRouter's base URL.

Degrades gracefully: when OPENROUTER_API_KEY is unset the client is None and the
generators return None, so callers keep whatever they already had (same
philosophy as the Notion integration — a missing integration never breaks a
request). Set the key in apps/api/.env.
"""

import json
import logging
from typing import Any

from openai import AsyncOpenAI

from .config import settings

log = logging.getLogger(__name__)

# The coach persona: brutally honest, execution-focused, no corporate softening —
# it mirrors the tone of the review's own reflection prompts.
_SYSTEM = (
    "You are a brutally honest performance coach reviewing a founder-engineer's "
    "weekly execution in a 12 Week Year cycle. You do not flatter. You call out "
    "the gap between how a week felt and what the numbers say, and you name "
    "recurring patterns and self-deception directly. Be specific and concise. "
    "Never use hype or filler."
)


def _client() -> AsyncOpenAI | None:
    if not settings.openrouter_api_key:
        return None
    return AsyncOpenAI(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        # Optional OpenRouter attribution headers (used for its dashboards/ranking).
        default_headers={"X-Title": "Life OS — 12 Week Review"},
    )


async def _complete(messages: list[dict[str, str]], *, max_tokens: int) -> str | None:
    client = _client()
    if client is None:
        return None
    try:
        resp = await client.chat.completions.create(
            model=settings.openrouter_model,
            messages=messages,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return (resp.choices[0].message.content or "").strip() or None
    except Exception as e:  # AI being down must never 500 the caller.
        log.error("OpenRouter error: %s", e)
        return None


async def week_summary(week: dict[str, Any], prior: list[dict[str, Any]]) -> str | None:
    """A frozen, week-scoped note: how THIS week went, prior weeks only as context.

    `week` and each item of `prior` are week_review rows (week_number, exec_score,
    sleep_avg, answers, ...). Returns None when AI is unconfigured/unavailable.
    """
    context = "\n".join(
        f"Week {w['week_number']}: exec {w.get('exec_score')}%, answers={w.get('answers')}"
        for w in prior
    ) or "(no prior weeks)"
    user = (
        f"Prior weeks (context only):\n{context}\n\n"
        f"THIS week to analyze — Week {week['week_number']}:\n"
        f"execution {week.get('exec_score')}%, sleep {week.get('sleep_avg')}h\n"
        f"reflection answers: {json.dumps(week.get('answers', {}), ensure_ascii=False)}\n\n"
        "Write a 2–4 sentence analysis of THIS week only. You may say 'again' when "
        "a pattern repeats from prior weeks, but do not summarize the whole cycle — "
        "that is a separate report. Focus on what happened, what went wrong, and the "
        "one thing that matters most."
    )
    return await _complete(
        [{"role": "system", "content": _SYSTEM}, {"role": "user", "content": user}],
        max_tokens=300,
    )


async def cycle_patterns(weeks: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The rolling cross-week synthesis: ONE per cycle, regenerated at week close.

    Returns {headline, patterns: [{tone, text}], outlook} or None when AI is
    unconfigured/unavailable. `tone` is one of green|yellow|red.
    """
    body = "\n".join(
        f"Week {w['week_number']}: exec {w.get('exec_score')}%, sleep {w.get('sleep_avg')}h, "
        f"answers={json.dumps(w.get('answers', {}), ensure_ascii=False)}"
        for w in weeks
    ) or "(no weeks yet)"
    user = (
        f"All completed weeks so far:\n{body}\n\n"
        "Produce the cross-week pattern analysis for the cycle. Respond with ONLY a "
        "JSON object of the form: {\"headline\": string, \"patterns\": "
        "[{\"tone\": \"green|yellow|red\", \"text\": string}], \"outlook\": string}. "
        "3–5 patterns. Call recurring failures and feeling-vs-reality gaps directly."
    )
    raw = await _complete(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user},
        ],
        max_tokens=600,
    )
    if raw is None:
        return None
    try:
        # Strip a possible ```json fence before parsing.
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError) as e:
        log.error("cycle_patterns: bad JSON from model: %s", e)
        return None
