import asyncio
from django.core.cache import cache
from django.utils.timezone import now
from asgiref.sync import sync_to_async

active_loops = {}  # { room_group_name: asyncio.Task }


async def ensure_timer_loop(room_group_name, org_id, room_name, channel_layer):
    """
    Ensures a timer loop exists for a given meeting room.
    If one already exists, it is reused. If not, it is created.
    """
    if room_group_name in active_loops:
        print(f"⏸ Timer loop already running for {room_group_name}")
        return

    print(f"✅ Starting persistent timer loop for {room_group_name}")
    video_key = f"video_state:{org_id}:{room_name}"

    async def loop():
        try:
            while True:
                await asyncio.sleep(1.0)
                state = await sync_to_async(cache.get)(video_key)
                if not isinstance(state, dict):
                    continue

                if not state.get("stopped", True):
                    print("HELLO")
                    state["current_time"] = float(state.get("current_time", 0.0)) + 1.0
                    state["last_updated"] = now().isoformat()
                    await sync_to_async(cache.set)(video_key, state, timeout=None)
                    await channel_layer.group_send(
                        room_group_name,
                        {"type": "video_state_update", "state": state},
                    )
                    print(f"📡 [{room_group_name}] time={state['current_time']:.2f}s")
        except asyncio.CancelledError:
            print(f"🧹 Timer loop cancelled for {room_group_name}")
            return

    loop_task = asyncio.get_running_loop().create_task(loop())
    active_loops[room_group_name] = loop_task


async def stop_timer_loop(room_group_name):
    """Stops and removes the timer loop for a meeting."""
    task = active_loops.pop(room_group_name, None)
    if task:
        task.cancel()
        print(f"🧹 Stopped timer loop for {room_group_name}")