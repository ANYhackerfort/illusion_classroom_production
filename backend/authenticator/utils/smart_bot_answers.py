# smart_bot_answers.py

import traceback
import random
import json
from openai import OpenAI
from django.conf import settings
import re

client = OpenAI(api_key=settings.OPENAI_API_KEY)


class SmartBotAnswerEngine:
    @staticmethod
    def generate_all_bot_answers(
        bots,
        question_text,
        choices,
        current_question_index,
        start_time,
        end_time,
        question_type="multiple_choice"  # new param
    ):
        
        start_time = start_time + 5
        
        print("🤖 [DEBUG] Starting smart answer generation...", flush=True)
        print(f"  • Question index: {current_question_index}", flush=True)
        print(f"  • Question text: {question_text}", flush=True)
        print(f"  • Question type: {question_type}", flush=True)
        print(f"  • Choices: {choices}", flush=True)
        print(f"  • Start time: {start_time}, End time: {end_time}", flush=True)
        print(f"  • Number of bots: {len(bots)}", flush=True)

        # Build bot memory lines
        bot_memory_lines = []
        for bot in bots:
            mem_line = f"{bot.name} ({bot.identifier}): {bot.memory or 'No memory provided'}"
            bot_memory_lines.append(mem_line)
            print(f"    - Bot memory loaded: {mem_line}", flush=True)

        # Dynamic system instructions
        if question_type == "mc":
            instructions = (
                "You are simulating bot participants for a classroom quiz. Each bot has a unique memory. "
                "You will be given a multiple-choice question with answer choices and each bot's memory. "
                "Select the **single most appropriate answer choice** for each bot based on their memory. If they are dumb, they get it wrong. If they are smart, they still might get it wrong."
                "Also, generate a random timestamp between the given time range (start_time, end_time) for when each bot responds. "
                "Reply in JSON format like this:\n\n"
                "[\n  {\"name\": \"Bot1\", \"answer\": \"A\", \"timestamp\": 13.57},\n"
                "  {\"name\": \"Bot2\", \"answer\": \"C\", \"timestamp\": 14.12}\n]"
            )
        elif question_type == "multi_select":
            instructions = (
                "You are simulating bot participants for a classroom quiz. Each bot has a unique memory. "
                "You will be given a multiple-select question with answer choices and each bot's memory. "
                "Select **one or more answer choices** for each bot as a list, based on their memory. "
                "Also, generate a random timestamp between the given time range (start_time, end_time) for when each bot responds. "
                "Reply in JSON format like this:\n\n"
                "[\n  {\"name\": \"Bot1\", \"answers\": [\"A\", \"C\"], \"timestamp\": 13.57},\n"
                "  {\"name\": \"Bot2\", \"answers\": [\"B\"], \"timestamp\": 14.12}\n]"
            )
        elif question_type == "short":
            instructions = (
                "You are simulating bot participants for a classroom quiz. Each bot has a unique memory. "
                "You will be given a short-answer question and each bot's memory. "
                "Provide a **short free-text response** for each bot, written in Human language (some really short, some longer depending on their memory). "
                "Also, generate a random timestamp between the given time range (start_time, end_time) for when each bot responds. "
                "Reply in JSON format like this:\n\n"
                "[\n  {\"name\": \"Bot1\", \"answer\": \"The mitochondria is the powerhouse of the cell\", \"timestamp\": 13.57},\n"
                "  {\"name\": \"Bot2\", \"answer\": \"To store energy\", \"timestamp\": 14.12}\n]"
            )
        else:
            instructions = "You are simulating bot answers. Unknown question type."

        messages = [
            {"role": "system", "content": instructions},
            {
                "role": "user",
                "content": (
                    f"Question: {question_text}\n"
                    f"Choices: {', '.join(choices) if choices else 'N/A'}\n"
                    f"Start time: {start_time}\n"
                    f"End time: {end_time}\n"
                    "Bot Memories:\n" + "\n".join(bot_memory_lines)
                ),
            },
        ]

        try:
            print("📤 [DEBUG] Sending request to OpenAI...", flush=True)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=512,
                temperature=0.7,
            )
            print("✅ [DEBUG] GPT response received", flush=True)

            raw_content = response.choices[0].message.content.strip()
            print("📥 [DEBUG] Raw GPT content:", flush=True)
            print(raw_content, flush=True)

            # --- Manual JSON parsing ---
            match = re.search(r"\[.*\]", raw_content, re.DOTALL)
            if not match:
                print("⚠️ [DEBUG] No JSON array found in GPT output", flush=True)
                return []

            json_like = match.group(0).replace("\n", "").replace("\r", "")

            try:
                parsed_json = json.loads(json_like)
            except json.JSONDecodeError as je:
                print("⚠️ [DEBUG] Strict JSON parse failed, falling back:", je, flush=True)
                parsed_json = []
                for m in re.finditer(r"\{.*?\}", json_like):
                    try:
                        parsed_json.append(json.loads(m.group(0)))
                    except Exception as inner:
                        print("⚠️ [DEBUG] Skipping invalid object:", m.group(0), flush=True)

            print("📊 [DEBUG] Parsed JSON response:", flush=True)
            print(parsed_json, flush=True)

            return parsed_json

        except Exception as e:
            print("❌ [ERROR] Failed to generate smart bot answers", flush=True)
            print("Exception:", str(e), flush=True)
            traceback.print_exc()
            return []
