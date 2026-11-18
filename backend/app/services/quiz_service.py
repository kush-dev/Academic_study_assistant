
import json
import re

from app.services.llm_service import generate_chat_completion


async def generate_quiz_questions(
    passages: str,
    count: int = 10,
    difficulty: str | None = None,
    prioritized_topics: list[str] | None = None,
) -> list[dict]:
    """
    Generate and validate multiple-choice questions from document passages.

    Optional difficulty and prioritized topics allow the same service
    to generate personalized adaptive quizzes.
    """

    if not passages or not passages.strip():
        raise ValueError("Document passages cannot be empty.")

    if count < 1 or count > 30:
        raise ValueError("Question count must be between 1 and 30.")

    difficulty_instruction = ""

    if difficulty:
        allowed_difficulties = {
            "Easy",
            "Medium",
            "Hard",
            "Advanced",
        }

        if difficulty not in allowed_difficulties:
            raise ValueError("Invalid quiz difficulty.")

        difficulty_instruction = f"""
QUIZ DIFFICULTY:
Generate questions at the {difficulty.upper()} difficulty level.

Difficulty guidelines:
- Easy: Test basic understanding, definitions, and direct recall.
- Medium: Test understanding, explanations, and straightforward applications.
- Hard: Test deeper understanding, comparisons, and multi-step reasoning.
- Advanced: Test complex applications, critical analysis, and relationships
  between concepts.

Ensure the actual questions reflect the selected difficulty.
"""

    topic_instruction = ""

    if prioritized_topics:
        topics_text = "\n".join(
            f"- {topic}" for topic in prioritized_topics
        )

        topic_instruction = f"""
PRIORITIZED TOPICS:
The student's previous quiz performance indicates that these topics
need additional practice:

{topics_text}

Generate more questions from these topics where the document
contains sufficient supporting information.

Do not invent information or introduce topics absent from the passages.
Use the remaining questions to provide balanced revision of other
important document concepts.
"""

    prompt = f"""
Create exactly {count} academic multiple-choice questions using
ONLY the supplied document passages.

DOCUMENT PASSAGES:
{passages}

{difficulty_instruction}

{topic_instruction}

REQUIREMENTS:
1. Each question must test understanding of the document.
2. Each question must have exactly four answer options.
3. Only one option must be correct.
4. correct_option must be an integer from 0 to 3.
5. Explanations must be supported by the document passages.
6. Avoid duplicate questions.
7. Do not invent facts or use outside knowledge.
8. Assign each question a short topic label of 2 to 5 words.
9. Topic labels must describe the specific concept tested.
10. Use consistent topic labels for questions about the same concept.
11. Do not use a broad label such as "General" unless no specific topic
    can reasonably be identified.
12. Return exactly {count} questions.
13. Return valid JSON only, without Markdown or code fences.

Required JSON structure:
{{
    "questions": [
        {{
            "question_text": "Question?",
            "options": [
                "Option A",
                "Option B",
                "Option C",
                "Option D"
            ],
            "correct_option": 0,
            "explanation": "Explanation based on the document.",
            "topic": "Specific Topic"
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
                    "You are an academic assessment generator. "
                    "Create accurate questions using only supplied "
                    "document passages. Assign meaningful topic labels. "
                    "Follow the requested difficulty and topic priorities. "
                    "Return valid JSON only."
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
            max_tokens=4000,
        )

        try:
            cleaned = response.strip()

            cleaned = re.sub(
                r"^```(?:json)?\s*",
                "",
                cleaned,
                flags=re.IGNORECASE,
            )

            cleaned = re.sub(r"\s*```$", "", cleaned)

            data = json.loads(cleaned)
            questions = data.get("questions")

            if not isinstance(questions, list):
                raise ValueError(
                    "Response must contain a questions list."
                )

            if len(questions) != count:
                raise ValueError(
                    f"Expected {count} questions, "
                    f"received {len(questions)}."
                )

            validated_questions = []

            for question in questions:
                if not isinstance(question, dict):
                    raise ValueError(
                        "Each question must be a JSON object."
                    )

                question_text = question.get("question_text")
                options = question.get("options")
                correct_option = question.get("correct_option")
                explanation = question.get("explanation")
                topic = question.get("topic", "General")

                if (
                    not isinstance(question_text, str)
                    or not question_text.strip()
                ):
                    raise ValueError("Question text is missing.")

                if (
                    not isinstance(options, list)
                    or len(options) != 4
                    or not all(
                        isinstance(option, str) and option.strip()
                        for option in options
                    )
                ):
                    raise ValueError(
                        "Every question must have four non-empty options."
                    )

                if (
                    not isinstance(correct_option, int)
                    or isinstance(correct_option, bool)
                    or correct_option not in range(4)
                ):
                    raise ValueError(
                        "correct_option must be an integer from 0 to 3."
                    )

                if (
                    not isinstance(explanation, str)
                    or not explanation.strip()
                ):
                    raise ValueError("Question explanation is missing.")

                if not isinstance(topic, str) or not topic.strip():
                    topic = "General"

                validated_questions.append(
                    {
                        "question_text": question_text.strip(),
                        "options": [
                            option.strip() for option in options
                        ],
                        "correct_option": correct_option,
                        "explanation": explanation.strip(),
                        "topic": topic.strip()[:120],
                    }
                )

            return validated_questions

        except (json.JSONDecodeError, ValueError, AttributeError) as exc:
            last_error = str(exc)

    raise ValueError(
        "Could not generate valid quiz questions after two attempts: "
        f"{last_error}"
    )
