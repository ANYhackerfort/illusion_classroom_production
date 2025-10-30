import traceback
import json
import re
from openai import OpenAI
from django.conf import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)


class SmartBotAnswerEngine:
    @staticmethod
    def generate_simple_answers(question, answers, question_type="mc", bot_memory=""):
        """
        Generate simple AI answers given a question, possible answers, question type,
        and optional bot memory (string describing personality or context).
        Returns a list of answer strings.
        """

        print("🤖 [DEBUG] Generating simple answers...", flush=True)
        print(f"  • Question: {question}", flush=True)
        print(f"  • Answers: {answers}", flush=True)
        print(f"  • Type: {question_type}", flush=True)
        print(f"  • Memory: {bot_memory}", flush=True)

        # Instructions by type
        if question_type == "mc":
            instructions = (
                "You are simulating a bot with memory answering a multiple-choice question. "
                "Use the bot's memory to decide which option(s) it might choose — correct or not. "
                "Return only an array of strings containing your selected answers. Example:\n"
                "[\"A\"] or [\"A\", \"C\"]"
            )
        elif question_type == "multi_select":
            instructions = (
                "You are simulating a bot with memory answering a multiple-select question. "
                "Use the memory to select one or more plausible options. "
                "Return only an array of strings. Example:\n"
                "[\"A\", \"C\"]"
            )
        elif question_type == "short":
            instructions = (
                "You are simulating a bot with memory giving short-text answers. "
                "Given the question and memory, return one or more natural short answers in human language. "
                "Return only an array of strings. Example:\n"
                "[\"Because it stores energy\", \"To help the cell\"]"
            )
        else:
            instructions = (
                "You are generating answers for a bot with memory. "
                "Return only an array of strings."
            )

        messages = [
            {"role": "system", "content": instructions},
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n"
                    f"Choices: {', '.join(answers) if answers else 'N/A'}\n"
                    f"Bot Memory: {bot_memory or 'None'}"
                ),
            },
        ]

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=200,
                temperature=0.7,
            )

            raw_content = response.choices[0].message.content.strip()
            print("📥 [DEBUG] Raw GPT response:", raw_content, flush=True)

            # Extract JSON array (["A", "B", ...])
            match = re.search(r"\[.*\]", raw_content, re.DOTALL)
            if not match:
                print("⚠️ [DEBUG] No JSON array found, returning empty list", flush=True)
                return []

            json_like = match.group(0)
            parsed = json.loads(json_like)
            print("✅ [DEBUG] Parsed answers:", parsed, flush=True)

            # Ensure list of strings
            if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                return parsed
            else:
                print("⚠️ [DEBUG] Response not list[str], forcing cleanup", flush=True)
                return [str(x) for x in parsed]

        except Exception as e:
            print("❌ [ERROR] Failed to generate simple answers:", str(e), flush=True)
            traceback.print_exc()
            return []
