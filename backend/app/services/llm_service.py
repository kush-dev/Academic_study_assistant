
import httpx

from app.core.config import settings


OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"


async def generate_chat_completion(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 1200,
) -> str:
    """
    Send a chat completion request to OpenRouter and return
    the generated assistant response.
    """

    if not settings.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is missing.")

    if not messages:
        raise ValueError("Messages cannot be empty.")

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "X-Title": "AI-Powered Academic Study Assistant",
    }

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    timeout = httpx.Timeout(90.0, connect=15.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_CHAT_URL,
                headers=headers,
                json=payload,
            )

            response.raise_for_status()
            result = response.json()

    except httpx.HTTPStatusError as exc:
        error_message = exc.response.text[:500]
        raise RuntimeError(
            f"OpenRouter returned HTTP {exc.response.status_code}: "
            f"{error_message}"
        ) from exc

    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Could not connect to OpenRouter: {str(exc)}"
        ) from exc

    except ValueError as exc:
        raise RuntimeError(
            "OpenRouter returned an invalid JSON response."
        ) from exc

    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(
            "OpenRouter response did not contain a valid assistant message."
        ) from exc

    if isinstance(content, list):
        # Support providers that return content as text blocks.
        content = "\n".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict)
        )

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("The language model returned an empty response.")

    return content.strip()
