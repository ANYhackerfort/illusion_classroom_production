import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from django.urls import path
from authenticator.consumers import MeetingSyncConsumer, OrganizationUpdateConsumer # from your app

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "illusion_classroom.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/meeting/<int:org_id>/<str:room_name>/", MeetingSyncConsumer.as_asgi()),
            path("ws/org/<str:org_id>/", OrganizationUpdateConsumer.as_asgi()),  # 👈 new route
        ])
    ),
})
