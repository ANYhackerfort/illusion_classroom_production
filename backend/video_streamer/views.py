from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.conf import settings
import os

@csrf_exempt
@login_required
def upload_video(request):
    if request.method == "POST" and request.FILES.get("video"):
        user = request.user
        video = request.FILES["video"]

        user_path = os.path.join(settings.MEDIA_ROOT, user.username, "videos")
        os.makedirs(user_path, exist_ok=True)

        file_path = os.path.join(user_path, video.name)
        with open(file_path, "wb+") as destination:
            for chunk in video.chunks():
                destination.write(chunk)

        return JsonResponse({"success": True, "path": f"/media/{user.username}/videos/{video.name}"})
    return JsonResponse({"error": "Invalid request"}, status=400)
