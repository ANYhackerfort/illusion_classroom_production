from openai import OpenAI
import traceback
from django.conf import settings
import cv2
import base64

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class VideoDescriber:
    @staticmethod
    def sample_frames(video_path, count=4):
        print("📸 Sampling frames from:", video_path)
        frames = []
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            print("❌ Could not open video file.")
            return []

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"🔢 Total frames in video: {total_frames}")
        frame_idxs = [int(i * total_frames / count) for i in range(count)]

        for idx in frame_idxs:
            print(f"⏩ Seeking frame {idx}...")
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            success, frame = cap.read()
            if success:
                print(f"✅ Successfully read frame {idx}")
                _, buffer = cv2.imencode('.jpg', frame)
                base64_img = base64.b64encode(buffer).decode("utf-8")
                data_uri = f"data:image/jpeg;base64,{base64_img}"
                frames.append(data_uri)
            else:
                print(f"❌ Failed to read frame {idx}")

        cap.release()
        print(f"📦 Collected {len(frames)} frames.")
        return frames

    @staticmethod
    def generate_description_from_frames(frames):
        print("🧠 Sending frames to GPT for description...")
        if not frames:
            print("⚠️ No frames provided.")
            return ""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Based on the 4 sampled frames, describe what this video is about in 1-2 sentences.",
                            },
                            *[
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": frame
                                    }
                                }
                                for frame in frames
                            ]
                        ]
                    }
                ],
                max_tokens=200
            )

            print("✅ GPT response received")
            return response.choices[0].message.content.strip()

        except Exception as e:
            print("❌ Error during OpenAI Vision request:")
            traceback.print_exc()
            return "Could not generate description."
