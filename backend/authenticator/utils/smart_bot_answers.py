import traceback
import json
import re
from openai import OpenAI
from django.conf import settings
import random

client = OpenAI(api_key=settings.OPENAI_API_KEY)


class SmartBotAnswerEngine:
    @staticmethod
    def generate_simple_answers(
        question,
        answers,
        question_type="mc",
        bot_memory="",
        start_time=None,
        end_time=None,
        question_place=None,
    ):
        """
        Generate AI-simulated answers and a realistic response time between start_time and end_time.
        The bot answers based on its memory (including possible misconceptions or bias),
        and takes longer for harder or confusing questions.
        The question_place parameter tells the model the question’s sequence position (e.g. 1st, 2nd, etc.),
        allowing context like 'he gets question 2 wrong'.
        """

        print("🤖 [DEBUG] Generating simple answers with timing...", flush=True)
        print(f"  • Question: {question}", flush=True)
        print(f"  • Answers: {answers}", flush=True)
        print(f"  • Type: {question_type}", flush=True)
        print(f"  • Memory: {bot_memory}", flush=True)
        print(f"  • Start: {start_time}, End: {end_time}", flush=True)
        print(f"  • Question #: {question_place}", flush=True)

        # ========== Prompt templates ==========
        if question_type == "mc":
            instructions = (
                "You are simulating a bot answering a **single-choice multiple-choice question**. "
                "The bot’s behavior, correctness, and timing depend on its memory and the question number.\n\n"
                "If the bot’s memory suggests it usually misunderstands or confuses topics, it should reflect that — "
                "for example, it might choose the wrong answer if its memory says it tends to get question X wrong. "
                "If it has good memory or learns over time, it might correct itself later.\n\n"
                "Choose only **one** option from the given list, no more.\n\n"
                "Also decide how long (in seconds) the bot would take to answer between the provided start and end times:\n"
                "– easy / obvious → faster (near start)\n"
                "– uncertain / confused → slower (near end)\n\n"
                "Return your response **strictly as JSON**, e.g.:\n"
                "{\"answers\": [\"Carbon Dioxide\"], \"answer_time\": 11.4}"
            )

        elif question_type == "multi_select":
            instructions = (
                "You are simulating a bot answering a **multi-select** question. "
                "Use the bot’s memory and the question number to decide which options it might pick. "
                "It can choose multiple plausible answers (e.g. 1–3). "
                "Decide timing realistically (harder → slower). Return JSON:\n"
                "{\"answers\": [\"A\", \"C\"], \"answer_time\": 9.2}"
            )

        elif question_type == "short":
            instructions = (
                "You are simulating a bot giving a **short-text answer**. "
                "Base the response entirely on its memory and question sequence — "
                "for example, if it tends to get earlier questions wrong but improves later, reflect that. "
                "Take longer if uncertain or reflective. Return JSON like:\n"
                "{\"answers\": [\"Because it stores energy\"], \"answer_time\": 6.8}"
            )

        else:
            instructions = (
                "You are simulating a bot answering a general question. "
                "Base your decision on memory, and estimate response time realistically."
            )

        # ========== Time window setup ==========
        time_window = None
        if start_time is not None and end_time is not None:
            time_window = float(end_time) - float(start_time)
            time_window = max(time_window, 1.0)

        # ========== Build user prompt ==========
        user_prompt = (
            f"QuestionCard context:\n"
            f"Question #{question_place or '?'}:\n"
            f"Question: {question}\n"
            f"Choices: {', '.join(answers) if answers else 'N/A'}\n"
            f"Bot Memory (behavioral traits, biases, or misunderstandings): {bot_memory or 'None'}\n"
        )
        if time_window:
            user_prompt += f"The bot can answer between {start_time:.1f}s and {end_time:.1f}s (window: {time_window:.1f}s).\n"

        user_prompt += (
            "\nIf the memory mentions a specific question number (e.g., 'he gets question 2 wrong'), "
            "follow that exactly — make the corresponding question incorrect. "
            "Otherwise, behave naturally according to the memory tone (confident, forgetful, smart, etc.)."
        )

        messages = [
            {"role": "system", "content": instructions},
            {"role": "user", "content": user_prompt},
        ]

        # ========== Call GPT ==========
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=200,
                temperature=0.7,
            )

            raw_content = response.choices[0].message.content.strip()
            print("📥 [DEBUG] Raw GPT response:", raw_content, flush=True)

            # Try parsing JSON object
            match = re.search(r"\{.*\}", raw_content, re.DOTALL)
            if not match:
                print("⚠️ [DEBUG] No JSON object found — fallback to list", flush=True)
                match = re.search(r"\[.*\]", raw_content, re.DOTALL)
                if not match:
                    return {"answers": [], "answer_time": start_time or 0.0}

            json_like = match.group(0)
            parsed = json.loads(json_like)
            print("✅ [DEBUG] Parsed:", parsed, flush=True)

            # Validate structure
            if isinstance(parsed, dict):
                answers_out = parsed.get("answers", [])
                answer_time = parsed.get("answer_time", None)

                # ✅ Enforce single choice for MCQs
                if question_type == "mc" and isinstance(answers_out, list):
                    if len(answers_out) > 1:
                        answers_out = [answers_out[0]]

                # ✅ Clamp timing
                if time_window and answer_time is not None:
                    min_t, max_t = float(start_time), float(end_time)
                    if not (min_t <= float(answer_time) <= max_t):
                        answer_time = random.uniform(min_t, max_t)
                elif time_window:
                    answer_time = random.uniform(float(start_time), float(end_time))
                else:
                    answer_time = 0.0

                return {
                    "answers": [str(x) for x in answers_out],
                    "answer_time": round(float(answer_time), 2),
                }

            elif isinstance(parsed, list):
                single = [str(x) for x in parsed]
                if question_type == "mc" and len(single) > 1:
                    single = [single[0]]
                return {"answers": single, "answer_time": start_time or 0.0}

            return {"answers": [], "answer_time": start_time or 0.0}

        except Exception as e:
            print("❌ [ERROR] Failed to generate timed answers:", str(e), flush=True)
            traceback.print_exc()
            return {"answers": [], "answer_time": start_time or 0.0}
