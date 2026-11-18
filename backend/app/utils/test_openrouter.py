
import asyncio
import httpx

from app.core.config import settings


async def test_openrouter():
    if not settings.OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY is missing from .env")
        return

    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Academic Study Assistant",
    }

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Reply with exactly: "
                    "OpenRouter connection successful."
                ),
            }
        ],
        "temperature": 0,
        "max_tokens": 30,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload,
            )

            if response.status_code != 200:
                print("OPENROUTER REQUEST FAILED")
                print(f"HTTP status: {response.status_code}")
                print(response.text[:1500])
                return

            data = response.json()
            answer = data["choices"][0]["message"]["content"]

            print("OPENROUTER CONNECTION SUCCESSFUL")
            print(f"Model: {data.get('model', settings.OPENROUTER_MODEL)}")
            print(f"Response: {answer}")

    except httpx.RequestError as error:
        print("NETWORK CONNECTION FAILED")
        print(str(error))


if __name__ == "__main__":
    asyncio.run(test_openrouter())
