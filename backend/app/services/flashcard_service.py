
import json
import re

from app.services.llm_service import generate_chat_completion


async def generate_flashcards(
    passages: str,
    count: int = 10,
) -> list[dict]:
    """
    Generate and validate flashcards using retrieved document passages.
    """

    if not passages or not passages.strip():
        raise ValueError("Document passages cannot be empty.")

    if count < 1 or count > 30:
        raise ValueError("Flashcard count must be between 1 and 30.")

    prompt = f"""
Create exactly {count} useful academic flashcards using ONLY
the document passages below.

DOCUMENT PASSAGES:
{passages}

REQUIREMENTS:
1. Each flashcard must have a clear question on the front.
2. Each answer must be accurate and supported by the passages.
3. Do not invent facts or introduce outside information.
4. Avoid duplicate or repetitive flashcards.
5. Difficulty must be one of: easy, medium, hard.
6. Return exactly {count} flashcards.
7. Return valid JSON only. Do not use Markdown or code fences.

Required JSON structure:
{{
    "flashcards": [
        {{
            "front": "Question",
            "back": "Answer",
            "difficulty": "easy"
        }}
    ]
}}
"""

    last_error = None

    for attempt in range(2):
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an academic flashcard generator. "
                    "Use only supplied document passages. "
                    "Return valid JSON without additional commentary."
                ),
            },
            {
                "role": "user",
                "content": (
                    prompt
                    if attempt == 0
                    else (
                        prompt
                        + "\n\nYour previous response was invalid. "
                        + f"Validation error: {last_error}. "
                        + "Return corrected JSON only."
                    )
                ),
            },
        ]

        response = await generate_chat_completion(
            messages=messages,
            temperature=0.2,
            max_tokens=3000,
        )

        try:
            cleaned = re.sub(
                r"^```(?:json)?\s*|\s*```$",
                "",
                response.strip(),
                flags=re.IGNORECASE,
            )

            data = json.loads(cleaned)

            flashcards = data.get("flashcards")

            if not isinstance(flashcards, list):
                raise ValueError("Response must contain a flashcards list.")

            if len(flashcards) != count:
                raise ValueError(
                    f"Expected {count} flashcards, received {len(flashcards)}."
                )

            validated_cards = []

            for card in flashcards:
                if not isinstance(card, dict):
                    raise ValueError("Each flashcard must be a JSON object.")

                front = card.get("front")
                back = card.get("back")
                difficulty = card.get("difficulty")

                if not isinstance(front, str) or not front.strip():
                    raise ValueError("Flashcard front is missing.")

                if not isinstance(back, str) or not back.strip():
                    raise ValueError("Flashcard back is missing.")

                if not isinstance(difficulty, str):
                    raise ValueError("Flashcard difficulty is missing.")

                difficulty = difficulty.lower().strip()

                if difficulty not in ("easy", "medium", "hard"):
                    raise ValueError(
                        "Difficulty must be easy, medium, or hard."
                    )

                validated_cards.append(
                    {
                        "front": front.strip(),
                        "back": back.strip(),
                        "difficulty": difficulty,
                    }
                )

            return validated_cards

        except (json.JSONDecodeError, ValueError, AttributeError) as exc:
            last_error = str(exc)

    raise ValueError(
        f"Could not generate valid flashcards after two attempts: {last_error}"
    )
