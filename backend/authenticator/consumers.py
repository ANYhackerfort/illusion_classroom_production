import asyncio
import json
import psutil
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils.timezone import now
from django.core.cache import cache
from asgiref.sync import sync_to_async
from .meeting_timer import ensure_timer_loop
import time

def log_memory_usage(tag=""):
    process = psutil.Process()
    mem_mb = process.memory_info().rss / 1024 / 1024
    print(f"[MEMORY] {tag} — RSS Memory: {mem_mb:.2f} MB")


import asyncio
import json
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from django.utils.timezone import now
import psutil


def log_memory_usage(tag=""):
    process = psutil.Process()
    mem_mb = process.memory_info().rss / 1024 / 1024
    print(f"[MEMORY] {tag} — RSS Memory: {mem_mb:.2f} MB")

class MeetingSyncConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer that ensures a persistent video timer loop
    per group (meeting). The loop lives independently of connections
    and runs until the meeting is explicitly deleted.
    """

    async def connect(self):
        self.org_id = self.scope["url_route"]["kwargs"]["org_id"]
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"meeting_{self.org_id}_{self.room_name}"

        print(f"[MeetingSync] 🔗 Connected to {self.room_group_name}")
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Initialize meeting + video state if missing
        await self.ensure_meeting_and_video_state()

        # Ensure persistent timer loop for this group
        await ensure_timer_loop(
            self.room_group_name, self.org_id, self.room_name, self.channel_layer
        )

        print(f"✅ Persistent loop ensured for {self.room_group_name}")

    async def disconnect(self, close_code):
        """Client disconnects — does NOT stop the loop."""
        print(f"🔌 Client {self.channel_name} left {self.room_group_name}")
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def ensure_meeting_and_video_state(self):
        """Ensures cache has initial meeting/video state."""
        cache_key = f"active_meeting:{self.org_id}:{self.room_name}"
        meeting_state = await sync_to_async(cache.get)(cache_key)
        if not isinstance(meeting_state, dict):
            print(f"⚠️ No active meeting found, creating one: {cache_key}")
            meeting_state = {
                "org_id": int(self.org_id),
                "room_name": str(self.room_name),
                "active_bot_ids": [],
                "active_video_id": None,
                "active_survey_id": None,
                "last_updated": None,
            }
            await sync_to_async(cache.set)(cache_key, meeting_state, timeout=None)

        video_key = f"video_state:{self.org_id}:{self.room_name}"
        video_state = await sync_to_async(cache.get)(video_key)
        if not isinstance(video_state, dict):
            video_state = {"stopped": True, "current_time": 0.0}
            await sync_to_async(cache.set)(video_key, video_state, timeout=None)

        # Send combined state to the client
        await self.send(text_data=json.dumps({
            "type": "initial_meeting_state",
            "state": {**meeting_state, **video_state},
        }))
        print(f"✅ Sent initial state for {self.room_group_name}")

    # ======================================================
    # Message Handlers
    # ======================================================
    async def video_state_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "sync_update",
            "state": event["state"],
        }))

    async def meeting_state_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "meeting_state_changed",
            "state": event["state"],
        }))
        
class OrganizationUpdateConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.org_id = self.scope["url_route"]["kwargs"]["org_id"]
        self.group_name = f"org_{self.org_id}_updates"

        print(f"[OrgConsumer] 🔗 {self.channel_name} joined {self.group_name}")
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        print(f"[OrgConsumer] 🔌 {self.channel_name} leaving {self.group_name}")
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            msg = json.loads(text_data)
            print(f"[OrgConsumer] Message from client: {msg}")
        except json.JSONDecodeError:
            print("❌ Invalid JSON from client")

    async def org_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "org_update",
            "category": event.get("category", "general"),
            "action": event.get("action", "update"),
            "payload": event.get("payload", {}),
        }))
