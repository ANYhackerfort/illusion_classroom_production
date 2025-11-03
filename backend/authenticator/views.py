import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth import get_user_model, login
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required

import requests
from .models import Meeting, VideoSegment, QuestionCard, Bot, Participant, Survey, Organization
from django.utils.timezone import now
from django.core.serializers.json import DjangoJSONEncoder
from django.core.cache import cache

import os
from django.conf import settings
import datetime
import random
from .models import Meeting, Video

from .utils.video_description import VideoDescriber
from django.dispatch import receiver
from .models import UserProfile
from django.db.models.signals import post_save
from django.core.files.base import ContentFile
from django.utils.crypto import get_random_string
from django.db import models

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
        
@csrf_exempt
@login_required
def get_meeting_id(request, org_id, room_name):
    """
    Retrieve the unique meeting ID given the organization ID and meeting name (room_name).
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        # ✅ Validate organization
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        # ✅ Validate meeting
        meeting = Meeting.objects.filter(name=room_name, organization=organization).first()
        if not meeting:
            return JsonResponse({"error": f"Meeting '{room_name}' not found."}, status=404)

        # ✅ Return meeting ID
        return JsonResponse({
            "meeting_id": str(meeting.id),
            "organization_id": str(org_id),
            "meeting_name": meeting.name,
        }, status=200)

    except Exception as e:
        print("❌ Error in get_meeting_id:", e)
        return JsonResponse({"error": str(e)}, status=500)
        
@csrf_exempt
@login_required
def get_user_stats(request):
    user = request.user
    cache_key = f"user_stats:{user.id}"

    # ✅ Try cache first
    cached_data = cache.get(cache_key)
    if cached_data:
        return JsonResponse(cached_data)

    # 📊 Compute stats
    meetings = Meeting.objects.filter(owner=user)
    total_meetings = meetings.count()

    # Meeting creation dates
    meeting_dates = list(meetings.values_list("created_at", flat=True))

    # Total video length across all meetings
    total_video_length = meetings.aggregate(models.Sum("video_length_sec"))["video_length_sec__sum"] or 0

    # Unique collaborators across meetings (from shared_with + participants)
    collaborators = set()
    for m in meetings:
        # shared_with JSON list
        collaborators.update(m.shared_with or [])
        # participants email
        collaborators.update(m.participants.values_list("email", flat=True))
    total_collaborators = len(collaborators)

    # Earliest meeting date for "membership" proxy (or fallback to user.date_joined if available)
    first_meeting = meetings.order_by("created_at").first()
    membership_start = getattr(user, "date_joined", None) or (first_meeting.created_at if first_meeting else None)
    membership_duration_days = (now() - membership_start).days if membership_start else 0

    # Average meeting video length
    avg_video_length = total_video_length / total_meetings if total_meetings > 0 else 0

    # Pack everything nicely for frontend
    stats = {
        "userEmail": user.email,
        "totalMeetings": total_meetings,
        "meetingDates": [d.isoformat() for d in meeting_dates],
        "totalVideoLengthSec": total_video_length,
        "averageVideoLengthSec": avg_video_length,
        "totalCollaborators": total_collaborators,
        "membershipStart": membership_start.isoformat() if membership_start else None,
        "membershipDurationDays": membership_duration_days,
    }

    # ✅ Cache result for 5 minutes
    cache.set(cache_key, stats, timeout=60 * 5)

    return JsonResponse(stats)

@csrf_exempt
def google_login_view(request):
    if request.method != 'POST':
        print("❌ Wrong method:", request.method)
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
        access_token = data.get('token')
        print("🔑 Access token received:", access_token[:10] + "..." if access_token else None)

        # Call Google userinfo endpoint
        user_info = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        ).json()
        print("📩 Google user info:", user_info)

        email = user_info.get("email")
        name = user_info.get("name")
        picture_url = user_info.get("picture") or \
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=400&q=80"
        print(f"👤 Parsed -> Email: {email}, Name: {name}, Picture: {picture_url}")

        if not email:
            print("❌ No email found in Google user info")
            return JsonResponse({'error': 'Email not found'}, status=400)

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'username': email, 'first_name': name or ''}
        )
        print("✅ User created?" , created, "| User:", user)

        # ✅ safely create or update UserProfile
        profile, prof_created = UserProfile.objects.get_or_create(user=user)
        print("✅ UserProfile created?", prof_created, "| Profile:", profile)

        # ✅ Update if missing OR Google picture changed
        should_update_picture = False
        if not profile.profile_picture:
            print("🖼 No existing profile picture — need to fetch")
            should_update_picture = True
        elif profile.profile_picture and picture_url not in profile.profile_picture.url:
            print("♻️ Google picture URL changed, updating local copy")
            should_update_picture = True

        if should_update_picture:
            try:
                resp = requests.get(picture_url, timeout=5)
                print("🌐 Fetched picture -> Status:", resp.status_code, "Length:", len(resp.content))
                if resp.status_code == 200:
                    filename = f"{user.id}_{get_random_string(8)}.jpg"
                    profile.profile_picture.save(filename, ContentFile(resp.content), save=True)
                    print("✅ Saved/updated profile picture as:", filename)
            except Exception as e:
                print("⚠️ Could not fetch profile picture:", e)

        login(request, user)
        print("🔓 User logged in:", user.email)

        return JsonResponse({
            'message': 'Logged in',
            'email': user.email,
            'name': user.first_name,
            'picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
        })
    except Exception as e:
        print("💥 Exception in google_login_view:", e)
        return JsonResponse({'error': str(e)}, status=400)
    
@login_required
def get_user_info(request):
    user = request.user
    profile = getattr(user, "profile", None)

    # Prefer profile picture if it exists
    if profile and profile.profile_picture:
        # ✅ profile.profile_picture.url already resolves to MEDIA_URL + path
        picture = profile.profile_picture.url
    else:
        picture = (
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93"
            "?fit=crop&w=400&q=80"
        )

    return JsonResponse({
        "email": user.email,
        "name": user.first_name or user.email.split("@")[0],
        "picture": picture,  # ✅ Always a string URL now
    })

@csrf_exempt
@login_required
def check_login_status(request):
    user = request.user
    return JsonResponse({
        'logged_in': True,
        'email': user.email,
        'username': user.username,
    })

# @csrf_exempt
# @login_required
# def delete_meeting(request):
#     if request.method != 'POST':
#         return JsonResponse({'error': 'Only POST allowed'}, status=405)

#     try:
#         data = json.loads(request.body)
#         meeting_name = data.get('meetingName')
#         user = request.user

#         if not meeting_name:
#             return JsonResponse({'error': 'Missing meetingName'}, status=400)

#         meeting = Meeting.objects.get(name=meeting_name, owner=user)
#         meeting.delete()

#         # ✅ Clear both caches
#         current_cache_key = f"user_meetings:{user.id}"
#         archived_cache_key = f"user_archived_meetings:{user.id}"
#         cache.delete(current_cache_key)
#         cache.delete(archived_cache_key)

#         return JsonResponse({'message': 'Meeting deleted successfully'})

#     except Meeting.DoesNotExist:
#         return JsonResponse({'error': 'Meeting not found or not owned by user'}, status=404)
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def delete_meeting(request, org_id, meeting_name):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        # ✅ Try to find meeting just by org + name
        meeting = Meeting.objects.filter(
            name=meeting_name,
            organization_id=org_id
        ).first()

        if not meeting:
            return JsonResponse(
                {'error': f"Meeting '{meeting_name}' not found in organization {org_id}."},
                status=404
            )

        org = meeting.organization
        user = request.user

        # ✅ Permission check: only meeting owner, org owner, or org member can delete
        if user != meeting.owner and user != org.owner and user not in org.members.all():
            return JsonResponse({'error': 'Not authorized to delete this meeting.'}, status=403)

        # ✅ Perform deletion
        meeting.delete()
        print(f"🗑️ Deleted meeting '{meeting_name}' from org {org_id}")

        # ✅ Invalidate cache after commit
        cache.delete(f"org_meetings:{org_id}")
        print(f"🧹 Cache invalidated for org_meetings:{org_id}")

        return JsonResponse({'message': f"Meeting '{meeting_name}' deleted successfully."})

    except Exception as e:
        print("🔥 DELETE MEETING ERROR:", str(e))
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def archive_meeting(request, org_id, meeting_name):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        # ✅ Find meeting by name + organization (not by owner)
        meeting = Meeting.objects.filter(
            name=meeting_name,
            organization_id=org_id
        ).first()

        if not meeting:
            return JsonResponse(
                {'error': f"Meeting '{meeting_name}' not found in organization {org_id}."},
                status=404
            )

        # ✅ Optional: Permission check — only org owner or meeting owner can archive
        org = meeting.organization
        user = request.user
        if user != org.owner and user != meeting.owner and user not in org.members.all():
            return JsonResponse({'error': "Not authorized to archive this meeting"}, status=403)

        meeting.currently_playing = False
        meeting.save()
        
        cache.delete(f"org_meetings:{org_id}")

        return JsonResponse({'message': f"Meeting '{meeting_name}' archived successfully."})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
def unarchive_meeting(request, org_id, meeting_name):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        meeting = Meeting.objects.filter(
            name=meeting_name,
            organization_id=org_id
        ).first()

        if not meeting:
            return JsonResponse(
                {'error': f"Meeting '{meeting_name}' not found in organization {org_id}."},
                status=404
            )

        org = meeting.organization
        user = request.user
        if user != org.owner and user != meeting.owner and user not in org.members.all():
            return JsonResponse({'error': "Not authorized to unarchive this meeting"}, status=403)

        meeting.currently_playing = True
        meeting.save()

        cache.delete(f"org_meetings:{org_id}")
        
        return JsonResponse({'message': f"Meeting '{meeting_name}' unarchived successfully."})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
@csrf_exempt
@login_required
def create_meeting(request, org_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
        user = request.user

        name = data.get("name", "").strip()
        image_url = data.get("imageUrl")
        description = data.get("description")
        questions_count = data.get("questionsCount")
        video_length_sec = data.get("videoLengthSec")
        tags = data.get("tags", [])
        shared_with = data.get("sharedWith", [])
        video_segments = data.get("VideoSegments", [])

        # ✅ Ensure org exists
        try:
            org = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return JsonResponse({'error': f"Organization with id {org_id} not found"}, status=404)

        # ✅ Permissions: must be org member or owner
        if org.owner != user and user not in org.members.all():
            return JsonResponse({'error': "You are not part of this organization"}, status=403)

        # ✅ Warn if duplicate name already exists in org
        if Meeting.objects.filter(organization=org, name=name).exists():
            return JsonResponse(
                {'error': f"A meeting named '{name}' already exists in this organization."},
                status=400
            )

        # ✅ Create new meeting
        meeting = Meeting.objects.create(
            name=name,
            image_url=image_url,
            description=description,
            questions_count=questions_count,
            video_length_sec=video_length_sec,
            tags=tags,
            created_at=now(),
            owner=user,
            organization=org,
            shared_with=shared_with,
            currently_playing=True,
        )

        # ✅ Create video segments + question cards if any
        for seg in video_segments:
            q_data = seg.get("questionCardData")
            question_card = None
            if seg.get("isQuestionCard") and q_data:
                question_card = QuestionCard.objects.create(
                    question=q_data["question"],
                    answers=q_data["answers"],
                    difficulty=q_data["difficulty"],
                    type=q_data["type"]
                )

            VideoSegment.objects.create(
                meeting=meeting,
                source_start=seg["source"][0],
                source_end=seg["source"][1],
                question_card=question_card
            )

        cache.delete(f"org_meetings:{org_id}")
        
        return JsonResponse({
            'message': f"Meeting '{name}' created successfully.",
            'meeting_id': meeting.id,
            'organization_id': org.id,
        })

    except Exception as e:
        print("🔥 CREATE MEETING ERROR:", str(e))
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def get_org_meetings(request, org_id):
    try:
        cache_key = f"org_meetings:{int(org_id)}"
        print(f"🔑 Cache key: {cache_key}")

        # ✅ Try cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            print("📦 Using cached data")
            return JsonResponse(cached_data)

        # ✅ Validate organization
        try:
            org = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return JsonResponse({"error": f"Organization {org_id} not found"}, status=404)

        # ✅ Permission check
        user = request.user
        if user != org.owner and user not in org.members.all():
            return JsonResponse({"error": "Not authorized for this organization"}, status=403)

        # ✅ Query DB for all meetings in org
        meetings = Meeting.objects.filter(organization=org).order_by("-created_at")
        print(f"🔍 Found {meetings.count()} meetings for org {org_id}")

        # ✅ Serialize meeting data
        meeting_data = []
        for m in meetings:
            meeting_data.append({
                "name": m.name,
                "imageUrl": m.image_url,
                "description": m.description,
                "questionsCount": m.questions_count,
                "videoLengthSec": m.video_length_sec,
                "tags": m.tags or [],
                "createdAt": m.created_at.isoformat(),
                "ownerEmail": m.owner.email,
                "sharedWith": m.shared_with,
                "currentPlaying": m.currently_playing,
            })

        response_obj = {"meetings": meeting_data}

        # ✅ Cache for 5 minutes
        cache.set(cache_key, response_obj, timeout=60 * 5)
        print(f"💾 Cached {len(meeting_data)} meetings under {cache_key}")

        return JsonResponse(response_obj)

    except Exception as e:
        print("🔥 GET ORG MEETINGS ERROR:", e)
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def get_organizations(request):
    """Return all organizations that the current user belongs to (owner or member)."""
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    try:
        user = request.user
        orgs = Organization.objects.filter(
            models.Q(owner=user) | models.Q(members=user)
        ).distinct()

        results = []
        for org in orgs:
            results.append({
                "id": org.id,
                "name": org.name,
                "description": org.description,
                "created_at": org.created_at.isoformat(),
                "image_url": org.image.url if org.image else None,
                "owner_email": org.owner.email,
            })

        return JsonResponse({"organizations": results})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
@login_required
def create_organization(request):
    if request.method != "POST":
        print("[DEBUG] Invalid method:", request.method)
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        # --- Handle multipart form ---
        name = request.POST.get("name")
        description = request.POST.get("description", "")
        image = request.FILES.get("image")

        print("[DEBUG] Incoming POST data:", request.POST.dict())
        print("[DEBUG] Uploaded files:", request.FILES)

        if not name:
            print("[DEBUG] Missing organization name")
            return JsonResponse({"error": "Missing organization name"}, status=400)

        # --- Default image if none provided ---
        if not image:
            from django.core.files.images import ImageFile
            import os

            default_path = os.path.join(settings.MEDIA_ROOT, "organization_images/org_default.jpg")
            try:
                with open(default_path, "rb") as f:
                    image = ImageFile(f, name="sb_default.jpg")
                print("[DEBUG] Using default Santa Barbara image")
            except Exception as e:
                print("[DEBUG] Failed to load default image:", e)
                image = None  # fallback to null

        # --- Create org ---
        org = Organization.objects.create(
            owner=request.user,
            name=name,
            description=description,
            image=image,
        )
        org.members.add(request.user)  # ✅ owner auto-added as member
        print("[DEBUG] Organization created:", org.id, org.name)

        # --- Cache keys ---
        owner_cache_key = f"organization_name:{org.id}"
        email_cache_key = f"user:{request.user.email}_organizations"

        # --- Clear old caches ---
        cache.delete(owner_cache_key)
        cache.delete(email_cache_key)
        print("[DEBUG] Cleared cache keys:", owner_cache_key, email_cache_key)

        # --- Build org data ---
        org_data = {
            "id": org.id,
            "name": org.name,
            "description": org.description,
            "created_at": org.created_at.isoformat(),
            "image_url": org.image.url if org.image else None,
        }

        # --- Set caches ---
        cache.set(owner_cache_key, request.user.email, timeout=3600)
        cache.set(email_cache_key, [org_data], timeout=3600)
        print("[DEBUG] Cached organization data for:", request.user.email)

        return JsonResponse({
            "message": "Organization created successfully",
            "organization": org_data,
        })

    except Exception as e:
        print("[DEBUG] Exception during organization creation:", str(e))
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
@login_required
def join_organization(request, org_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        org = Organization.objects.get(id=org_id)
        user = request.user

        # ✅ Parse incoming JSON
        try:
            data = json.loads(request.body.decode("utf-8"))
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        owner_email = data.get("owner_email")
        if not owner_email:
            return JsonResponse({"error": "Owner email is required"}, status=400)

        # ✅ Check that provided email matches the actual org owner
        if org.owner.email.lower() != owner_email.lower():
            return JsonResponse({
                "error": "Owner email does not match this organization"
            }, status=403)

        # ✅ Check if already owner
        if org.owner == user:
            return JsonResponse({
                "message": f"You are already the owner of organization {org.name}",
                "already_owner": True,
                "organization": {
                    "id": org.id,
                    "name": org.name,
                }
            }, status=200)

        # ✅ Check if already member
        if org.members.filter(id=user.id).exists():
            return JsonResponse({
                "message": f"You are already a member of organization {org.name}",
                "already_member": True,
                "organization": {
                    "id": org.id,
                    "name": org.name,
                }
            }, status=200)

        # ✅ Otherwise, add as member
        org.members.add(user)

        # Invalidate cache
        email_cache_key = f"user:{user.email}_organizations"
        cache.delete(email_cache_key)

        return JsonResponse({
            "message": f"User {user.username} joined organization {org.name}",
            "joined": True,
            "organization": {
                "id": org.id,
                "name": org.name,
            }
        }, status=200)

    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
@login_required
def delete_organization(request, org_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        org = Organization.objects.get(id=org_id)
        if org.owner != request.user:
            return JsonResponse({"error": "Only the owner can delete this organization"}, status=403)

        org.delete()
        owner_cache_key = f"organization_name:{org_id}"
        email_cache_key = f"user:{request.user.email}_organizations"

        cache.delete(owner_cache_key)
        cache.delete(email_cache_key)

        return JsonResponse({"message": "Organization deleted successfully"})

    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
    
@csrf_exempt
@login_required
def check_organization_owner(request, org_id):
    """Check if the current user is the owner of the given org."""
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    try:
        owner_cache_key = f"organization_name:{org_id}"
        cached_owner_email = cache.get(owner_cache_key)

        if cached_owner_email:
            # ✅ If cache has it, just compare emails
            is_owner = (cached_owner_email == request.user.email)
        else:
            # ❌ Not in cache → check DB
            org = Organization.objects.get(id=org_id)
            is_owner = (org.owner == request.user)

            # ✅ Populate cache for future calls
            cache.set(owner_cache_key, org.owner.email, timeout=3600)

        return JsonResponse({
            "organization_id": org_id,
            "is_owner": is_owner
        })

    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
@login_required
def get_meeting_segments(request, meeting_name):
    try:
        user = request.user
        meeting = Meeting.objects.get(name=meeting_name, owner=user)
        segments = meeting.segments.all()

        segment_data = []
        for seg in segments:
            segment_info = {
                "sourceStart": seg.source_start,
                "sourceEnd": seg.source_end,
                "isQuestionCard": seg.question_card is not None,
            }

            if seg.question_card:
                qc = seg.question_card
                segment_info["questionCard"] = {
                    "id": str(qc.id),
                    "question": qc.question,
                    "answers": qc.answers,
                    "difficulty": qc.difficulty,
                    "type": qc.type,
                    "displayType": qc.display_type,
                    "showWinner": qc.show_winner,
                    "live": qc.live
                }

            segment_data.append(segment_info)

        return JsonResponse({
            "meetingName": meeting.name,
            "meetingLink": f"/media/videos/{meeting.name}.mp4",
            "segments": segment_data
        }, encoder=DjangoJSONEncoder)

    except Meeting.DoesNotExist:
        return JsonResponse({'error': 'Meeting not found or not owned by user'}, status=404)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def upload_meeting_video(request, meeting_name):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    video_file = request.FILES.get("video_file")
    if not video_file:
        return JsonResponse({"error": "Missing video_file"}, status=400)

    username = request.user.username
    user_folder = os.path.join(settings.MEDIA_ROOT, "videos", username, meeting_name)
    os.makedirs(user_folder, exist_ok=True)

    # Save the full video
    full_path = os.path.join(user_folder, "current_playing.webm")
    with open(full_path, "wb") as f:
        for chunk in video_file.chunks():
            f.write(chunk)

    return JsonResponse({"message": "Full video uploaded successfully"})


@csrf_exempt
@login_required
def refresh_meeting_segments(request, meeting_name):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
        video_segments = data.get("VideoSegments", [])
        user = request.user

        meeting = Meeting.objects.get(name=meeting_name, owner=user)

        # Clear old segments
        VideoSegment.objects.filter(meeting=meeting).delete()

        new_segments = []

        for seg in video_segments:
            q_data = seg.get("questionCardData")
            question_card = None
            q_card_dict = None

            if seg.get("isQuestionCard") and q_data:
                question_card = QuestionCard.objects.create(
                    question=q_data["question"],
                    answers=q_data["answers"],
                    difficulty=q_data["difficulty"],
                    type=q_data["type"],
                    display_type=q_data.get("displayType"),
                    show_winner=q_data.get("showWinner"),
                    live=q_data.get("live")
                )
                q_card_dict = {
                    "id": str(question_card.id),
                    "question": question_card.question,
                    "answers": question_card.answers,
                    "difficulty": question_card.difficulty,
                    "type": question_card.type,
                    "displayType": question_card.display_type,
                    "showWinner": question_card.show_winner,
                    "live": question_card.live,
                }

            VideoSegment.objects.create(
                meeting=meeting,
                source_start=seg["source"][0],
                source_end=seg["source"][1],
                question_card=question_card
            )

            new_segments.append({
                "source": [seg["source"][0], seg["source"][1]],
                "isQuestionCard": seg.get("isQuestionCard", False),
                "questionCardData": q_card_dict
            })

        cache.set(f"video_segments:{meeting.id}", new_segments, timeout=60 * 5)

        return JsonResponse({'message': 'Video segments updated and cached successfully'})

    except Meeting.DoesNotExist:
        return JsonResponse({'error': 'Meeting not found or not owned by user'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def edit_video(request, video_id, org_id, room_name):
    """
    Update video metadata and segments.
    Allowed if the user belongs to the same organization.
    Broadcasts org update → "update" action.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
        video_segments = data.get("VideoSegments", [])
        new_timestamp = data.get("lastEdited")  # ✅ ISO string from frontend
        new_name = data.get("name")
        new_tags = data.get("tags", [])

        # ✅ Fetch video and org
        video = Video.objects.filter(id=video_id).select_related("organization").first()
        if not video:
            return JsonResponse({"error": f"Video {video_id} not found."}, status=404)

        org = video.organization
        if not org:
            return JsonResponse({"error": "No organization linked to this video."}, status=400)

        # ✅ Verify org membership
        user = request.user
        is_owner = hasattr(org, "owner") and org.owner == user
        is_member = hasattr(org, "members") and user in org.members.all()

        if not (is_owner or is_member):
            return JsonResponse({"error": "User is not part of this organization."}, status=403)

        print(f"🧩 Editing metadata and segments for video {video.id} in org {org.name}")

        # ✅ Delete old segments
        VideoSegment.objects.filter(video=video).delete()

        new_segments = []
        for seg in video_segments:
            q_data = seg.get("questionCardData")
            question_card = None
            q_card_dict = None
            if seg.get("isQuestionCard") and q_data:
                question_card = QuestionCard.objects.create(
                    user=request.user,                # ✅ required field
                    organization=org,                 # ✅ keep consistent
                    question=q_data["question"],
                    answers=q_data["answers"],
                    difficulty=q_data["difficulty"],
                    type=q_data["type"],
                    display_type=q_data.get("displayType"),
                    show_winner=q_data.get("showWinner"),
                    live=q_data.get("live"),
                    correct_answers=q_data["correctAnswer"]
                )
                q_card_dict = {
                    "id": str(question_card.id),
                    "question": question_card.question,
                    "answers": question_card.answers,
                    "difficulty": question_card.difficulty,
                    "type": question_card.type,
                    "displayType": question_card.display_type,
                    "showWinner": question_card.show_winner,
                    "live": question_card.live,
                }

            VideoSegment.objects.create(
                video=video,
                source_start=seg["source"][0],
                source_end=seg["source"][1],
                question_card=question_card,
            )

            new_segments.append({
                "source": [seg["source"][0], seg["source"][1]],
                "isQuestionCard": seg.get("isQuestionCard", False),
                "questionCardData": q_card_dict,
            })

        # ✅ Update timestamp
        from django.utils import timezone
        from django.utils.dateparse import parse_datetime

        if new_timestamp:
            parsed = parse_datetime(new_timestamp)
            video.created_at = parsed if parsed else timezone.now()
        else:
            video.created_at = timezone.now()

        # ✅ Update name/tags if provided
        if new_name:
            video.name = new_name.strip()
        if new_tags:
            video.tags = new_tags

        video.save(update_fields=["created_at", "name", "tags"])
        cache.set(f"video_segments:{video.id}", new_segments, timeout=60 * 5)

        # ✅ Invalidate both user + org cache
        cache.delete_pattern(f"user_videos:*:{org.id}:*")
        cache.delete_pattern(f"org_videos:*:{org.id}*")

        # ✅ Broadcast update event to org group
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"org_{org.id}_updates",
            {
                "type": "org_update",
                "category": "video",
                "action": "update",
                "payload": {"id": str(video.id)},
            },
        )
        
        cache_key = f"active_meeting:{org_id}:{room_name}"

        existing = cache.get(cache_key)
        if isinstance(existing, dict):
            existing["last_updated"] = now().isoformat()
        else:
            # fallback if meeting not yet initialized
            existing = {
                "org_id": int(org_id),
                "room_name": str(room_name),
                "active_bot_ids": [],
                "active_video_id": video.id,
                "active_survey_id": None,
                "last_updated": now().isoformat(),
            }

        cache.set(cache_key, existing, timeout=60 * 60 * 10)
        
        async_to_sync(channel_layer.group_send)(
            f"meeting_{org_id}_{room_name}",
            {
                "type": "meeting_state_changed",
                "state": existing,
            },
        )

        return JsonResponse({
            "message": "Video metadata and segments updated successfully.",
            "lastEdited": video.created_at.isoformat(),
            "name": video.name,
            "tags": video.tags or [],
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)
    except Exception as e:
        print("❌ Error in edit_video:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@login_required
def get_video_by_id(request, video_id):
    """
    Retrieve full video metadata (segments, question cards, etc.) by ID.
    Only accessible to users belonging to the same organization.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests allowed."}, status=405)

    try:
        # ✅ Fetch video and related fields
        video = (
            Video.objects.filter(id=video_id)
            .select_related("organization", "meeting")
            .prefetch_related("segments__question_card")
            .first()
        )

        if not video:
            return JsonResponse({"error": f"Video {video_id} not found."}, status=404)

        organization = video.organization

        # ✅ Authorization: must be part of org (owner or member)
        is_owner = hasattr(organization, "owner") and organization.owner == request.user
        is_member = hasattr(organization, "members") and request.user in organization.members.all()

        if not (is_owner or is_member):
            return JsonResponse({"error": "User is not part of this organization."}, status=403)

        # ✅ Determine if video is individual (belongs to a meeting owned by user)
        individual = False
        if hasattr(video.meeting, "owner"):
            individual = video.meeting.owner == request.user

        # ✅ Build segment and question card data
        segments_data = []
        for segment in video.segments.all():
            q_data = None
            if segment.question_card:
                qc = segment.question_card
                q_data = {
                    "id": str(qc.id),
                    "question": qc.question,
                    "answers": qc.answers,
                    "difficulty": qc.difficulty,
                    "type": qc.type,
                    "displayType": qc.display_type,
                    "showWinner": qc.show_winner,
                    "live": qc.live,
                }

            segments_data.append({
                "id": str(segment.id),
                "source": [segment.source_start, segment.source_end],
                "isQuestionCard": bool(segment.question_card),
                "questionCardData": q_data,
            })

        # ✅ Build metadata for frontend
        metadata = {
            "id": str(video.id),
            "videoName": video.name or "Untitled Video",
            "videoTags": video.tags or [],
            "videoLength": sum(s.source_end - s.source_start for s in video.segments.all()),
            "questionCards": segments_data,
            "savedAt": video.created_at.isoformat(),
            "videoUrl": request.build_absolute_uri(video.url),
            "organization_id": str(video.organization.id),
            "individual": individual,
            "thumbnail_url": (
                request.build_absolute_uri(video.thumbnail_url)
                if video.thumbnail_url else None
            ),
            "associated_meeting_id": str(video.meeting.id) if video.meeting else None,  # ✅ added
        }

        print(f"🎬 Returned metadata for video {video.id} ({video.name})")
        return JsonResponse({"video": metadata}, status=200)

    except Exception as e:
        print("❌ Error in get_video_by_id:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def check_meeting_access(request, org_id, meeting_id):
    user = request.user
    if (request.user.is_authenticated == False):
        return JsonResponse({
            "admin_access": False,
        })
        
    user_email = user.email

    # 🔑 Separate cache keys
    admin_cache_key = f"meeting_admin_access:{org_id}:{meeting_id}:{user_email}"

    # ✅ Try cache first
    admin_access = cache.get(admin_cache_key)

    if admin_access is not None:
        return JsonResponse({
            "admin_access": admin_access,
        })

    try:
        meeting = Meeting.objects.get(name=meeting_id, organization_id=org_id)
    except Meeting.DoesNotExist:
        return JsonResponse({
            "admin_access": False,
        })

    org = meeting.organization  # ✅ fetch organization

    # ✅ Compute fresh values if not cached
    if admin_access is None:
        admin_access = (
            org.owner == user
            or org.members.filter(id=user.id).exists()
            or user_email in meeting.shared_with
        )
        cache.set(admin_cache_key, admin_access, timeout=300)
        
    return JsonResponse({
        "admin_access": admin_access,
    })

# @csrf_exempt
# @login_required
# def store_bot(request, meeting_name):
#     if request.method != "POST":
#         print("❌ Invalid request method:", request.method)
#         return JsonResponse({"error": "POST request required"}, status=405)

#     try:
#         user = request.user
#         print(f"👤 Request by user: {user.email} (ID: {user.id})")
#         print(f"📌 Meeting name from URL: {meeting_name}")

#         # Validate ownership
#         meeting = Meeting.objects.get(name=meeting_name)
#         print(f"✅ Found meeting: {meeting.name} (Owner: {meeting.owner.email})")

#         if meeting.owner != user:
#             print("🚫 Ownership check failed — user is not the meeting owner")
#             return JsonResponse({"error": "User does not own this meeting"}, status=403)

#         # Extract POST data
#         unique_id = request.POST.get("unique_id")
#         name = request.POST.get("name")
#         memory = request.POST.get("memory")
#         answers = request.POST.get("answers")
#         image_file = request.FILES.get("img")
#         video_file = request.FILES.get("video")

#         print("📥 Incoming fields:")
#         print("  - unique_id:", unique_id)
#         print("  - name:", name)
#         print("  - memory:", memory[:50] if memory else None)  # truncate preview
#         print("  - answers (raw):", answers)
#         print("  - image_file:", image_file.name if image_file else None)
#         print("  - video_file:", video_file.name if video_file else None)

#         if not all([unique_id, name]):
#             print("❌ Missing required fields")
#             return JsonResponse({"error": "Missing required fields"}, status=400)

#         # Parse answers if it's JSON
#         if isinstance(answers, str):
#             try:
#                 answers = json.loads(answers)
#                 print("✅ Parsed answers JSON:", answers)
#             except json.JSONDecodeError:
#                 print("❌ Invalid JSON for answers")
#                 return JsonResponse({"error": "Invalid JSON for answers"}, status=400)

#         # Handle video saving
#         video_url = None
#         if video_file:
#             print("🎥 Saving video...")
#             user_email = user.email or "unknown_user"
#             safe_meeting = meeting_name.replace("/", "_")
#             storage_path = os.path.join("bot_videos", user_email, safe_meeting, video_file.name)
#             full_path = os.path.join(settings.MEDIA_ROOT, storage_path)
#             os.makedirs(os.path.dirname(full_path), exist_ok=True)

#             with open(full_path, "wb+") as dest:
#                 for chunk in video_file.chunks():
#                     dest.write(chunk)
#             print("✅ Video saved at:", full_path)

#             video_url = f"{settings.MEDIA_URL}{storage_path}".replace("\\", "/")
#             print("🌐 Video URL:", video_url)

#         # Save Bot
#         print("💾 Saving Bot to database...")
#         bot = Bot.objects.create(
#             user=user,            # ✅ set the user who owns the bot
#             meeting=meeting,      # ✅ still associate with meeting
#             identifier=unique_id,
#             name=name,
#             memory=memory,
#             answers=answers,
#             image=image_file,
#             video_url=video_url,
#         )
#         print(f"✅ Bot created with ID: {bot.id}")

#         # Cache in Redis
#         redis_key = f"bot:{unique_id}"
#         redis_value = {
#             "name": name,
#             "memory": memory,
#             "answers": answers,
#             "video_url": video_url,
#         }
#         cache.set(redis_key, redis_value, timeout=60 * 10)
#         print(f"📦 Cached bot under key: {redis_key} → {redis_value}")

#         return JsonResponse({
#             "message": "Bot stored and cached",
#             "bot_id": bot.id,
#             "video_url": video_url,
#         })

#     except Meeting.DoesNotExist:
#         print("❌ Meeting not found:", meeting_name)
#         return JsonResponse({"error": "Meeting not found"}, status=404)
#     except Exception as e:
#         print("🔥 STORE BOT ERROR:", str(e))
#         return JsonResponse({"error": str(e)}, status=400)

# @csrf_exempt
# @login_required
# def delete_bot(request, bot_id):
#     if request.method not in ["DELETE", "POST"]:  # allow DELETE or POST
#         print("❌ Invalid request method:", request.method)
#         return JsonResponse({"error": "DELETE or POST request required"}, status=405)

#     try:
#         user = request.user
#         print(f"👤 Request by user: {user.email} (ID: {user.id})")
#         print(f"🗑️ Deleting bot with ID: {bot_id}")

#         # Fetch the bot
#         bot = Bot.objects.get(identifier=bot_id)

#         # Verify ownership
#         if bot.user != user:
#             print("🚫 Ownership check failed — user does not own this bot")
#             return JsonResponse({"error": "User does not own this bot"}, status=403)

#         # Remove files if present (optional)
#         if bot.image and os.path.isfile(bot.image.path):
#             os.remove(bot.image.path)
#             print(f"🗑️ Deleted image file: {bot.image.path}")

#         if bot.video_url and bot.video_url.startswith(settings.MEDIA_URL):
#             # Convert back to local file path
#             video_rel_path = bot.video_url.replace(settings.MEDIA_URL, "").lstrip("/")
#             video_abs_path = os.path.join(settings.MEDIA_ROOT, video_rel_path)
#             if os.path.isfile(video_abs_path):
#                 os.remove(video_abs_path)
#                 print(f"🗑️ Deleted video file: {video_abs_path}")

#         # Delete Redis cache
#         redis_key = f"bot:{bot.identifier}"
#         cache.delete(redis_key)
#         print(f"🗑️ Removed bot from cache: {redis_key}")

#         # Delete the bot
#         bot.delete()
#         print("✅ Bot deleted from database")

#         return JsonResponse({"message": "Bot deleted successfully"}, status=200)

#     except Bot.DoesNotExist:
#         print("❌ Bot not found")
#         return JsonResponse({"error": "Bot not found"}, status=404)
#     except Exception as e:
#         print("🔥 DELETE BOT ERROR:", str(e))
#         return JsonResponse({"error": str(e)}, status=400)

from .utils.smart_bot_answers import SmartBotAnswerEngine  # ✅ Import our helper class

@csrf_exempt
@login_required
def return_bot_answers(request, meeting_name):
    try:
        print("== Incoming GET Params ==")
        print("Raw meeting_name:", meeting_name)
        print("Decoded meeting_name:", meeting_name.encode().decode('utf-8', 'ignore'))
        print("GET:", request.GET)

        user = request.user
        current_question = int(request.GET.get("currentQuestion", -1))
        start_time = float(request.GET.get("startTime", -1))
        end_time = float(request.GET.get("endTime", -1))
        question_id = request.GET.get("questionId", f"q{current_question}")
        answers_raw = request.GET.get("answers", "")
        frontend_answers = answers_raw.split(",") if answers_raw else []
        question_type = request.GET.get("type", "")
        question_text = request.GET.get("questionText", "blank")
        
        print("THE QUESTION TYPE IS:", question_type)
        print("THE QUESTION TEXT IS:", question_text)

        print("Parsed current_question:", current_question)
        print("Parsed start_time:", start_time)
        print("Parsed end_time:", end_time)
        print("Frontend-provided answers:", frontend_answers)

        if (
            current_question < 0 or start_time < 0 or end_time < 0 or
            start_time >= end_time or not frontend_answers
        ):
            return JsonResponse({"error": "Invalid parameters"}, status=400)

        # Load meeting object
        meeting = Meeting.objects.get(name=meeting_name)
        print("Meeting found:", meeting.name)

        bots = meeting.bots.all()
        print(f"Found {bots.count()} bots")

        # Redis cache key
        redis_key = f"bot_answers:{meeting_name}:{question_id}"
        # cached = cache.get(redis_key)
        # if cached:
        #     print(f"Returning cached result for key: {redis_key}")
        #     return JsonResponse({"botAnswers": json.loads(cached)})

        # Generate answers
        bot_results = SmartBotAnswerEngine.generate_all_bot_answers(
            bots=bots,
            question_text=question_text,
            choices=frontend_answers,
            current_question_index=current_question,
            start_time=start_time,
            end_time=end_time,
            question_type=question_type,
        )
        
        bot_lookup = {bot.name: bot for bot in bots}
        enriched_results = []

        for res in bot_results:
            bot_obj = bot_lookup.get(res["name"])
            image_url = None

            if bot_obj:
                # ✅ ensure image_url for frontend
                if bot_obj.image:
                    image_url = request.build_absolute_uri(bot_obj.image.url)

                # ✅ update bot.answers JSON field
                answers_dict = bot_obj.answers or {}
                answers_dict[question_id] = res.get("answer")  # only store final answer
                bot_obj.answers = answers_dict
                bot_obj.save(update_fields=["answers"])

            enriched_results.append({
                **res,
                "image_url": image_url,
            })

        # Cache enriched results
        cache.set(redis_key, json.dumps(enriched_results), timeout=60 * 60)

        return JsonResponse({"botAnswers": enriched_results})

    except Meeting.DoesNotExist:
        print("Meeting not found!")
        return JsonResponse({"error": "Meeting not found"}, status=404)
    except Exception as e:
        print("Exception occurred:", str(e))
        return JsonResponse({"error": str(e)}, status=400)


# @csrf_exempt
# @login_required
# def get_all_bots(request, meeting_name):
#     try:
#         meeting = Meeting.objects.get(name=meeting_name)
#         bots = Bot.objects.filter(meeting=meeting)

#         bot_list = []
#         for bot in bots:
#             bot_list.append({
#                 "identifier": bot.identifier,
#                 "name": bot.name,
#                 "memory": bot.memory,
#                 "answers": bot.answers,
#                 "image": request.build_absolute_uri(bot.image.url) if bot.image else None,
#             })

#         return JsonResponse({"bots": bot_list})
#     except Meeting.DoesNotExist:
#         return JsonResponse({"error": "Meeting not found"}, status=404)
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=400)

import subprocess

@csrf_exempt
@login_required
def store_video(request, org_id, meeting_name):
    """
    Handle video upload:
    - Saves file + thumbnail
    - Creates Video + base segment
    - Broadcasts org update ("create")
    - Clears both user and org caches
    - Returns meeting_id in response
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    try:
        video_file = request.FILES.get("video_file")
        video_name = request.POST.get("video_name") or (video_file.name if video_file else None)
        tags_json = request.POST.get("tags", "[]")

        try:
            tags = json.loads(tags_json)
        except json.JSONDecodeError:
            tags = []

        print(f"✅ Received video: {video_name}")
        print(f"✅ Meeting name: {meeting_name}")
        print(f"✅ Org ID: {org_id}")
        print(f"✅ Tags: {tags}")

        if not video_file or not video_name:
            return JsonResponse({"error": "Missing video_file or video_name."}, status=400)

        # ✅ Get org + meeting
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        meeting = Meeting.objects.filter(name=meeting_name, organization=organization).first()
        if not meeting:
            return JsonResponse({"error": f"Meeting '{meeting_name}' not found."}, status=404)

        # ✅ Verify user belongs to org
        user = request.user
        is_owner = hasattr(organization, "owner") and organization.owner == user
        is_member = hasattr(organization, "members") and user in organization.members.all()
        if not (is_owner or is_member):
            return JsonResponse({"error": "User not part of this organization."}, status=403)

        # ✅ Save file
        user_email = request.user.email
        base_storage_path = f"videos/{user_email}/{meeting_name}/"
        os.makedirs(os.path.join(settings.MEDIA_ROOT, base_storage_path), exist_ok=True)

        file_root, file_ext = os.path.splitext(video_name)
        counter = 1
        final_name = video_name
        full_path = os.path.join(settings.MEDIA_ROOT, base_storage_path, final_name)

        while os.path.exists(full_path):
            final_name = f"{file_root}_{counter}{file_ext}"
            full_path = os.path.join(settings.MEDIA_ROOT, base_storage_path, final_name)
            counter += 1

        storage_path = os.path.join(base_storage_path, final_name)

        with open(full_path, "wb+") as dest:
            for chunk in video_file.chunks():
                dest.write(chunk)
        print(f"📦 Saved video file to {full_path}")

        # ✅ Generate thumbnail
        thumbnail_name = f"{file_root}_thumb.jpg"
        thumbnail_path = os.path.join(settings.MEDIA_ROOT, base_storage_path, thumbnail_name)

        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", full_path, "-ss", "00:00:01.000",
                "-vframes", "1", "-q:v", "2", thumbnail_path
            ], check=True)
            print(f"🖼️ Thumbnail generated: {thumbnail_path}")
        except subprocess.CalledProcessError as e:
            print("⚠️ Failed to generate thumbnail:", e)
            thumbnail_path = None

        # ✅ Optional AI description
        frames = VideoDescriber.sample_frames(full_path)
        description = VideoDescriber.generate_description_from_frames(frames)

        # ✅ Create DB record
        video = Video.objects.create(
            meeting=meeting,
            organization=organization,
            name=video_name,
            url=f"{settings.MEDIA_URL}{storage_path}",
            thumbnail_url=f"{settings.MEDIA_URL}{base_storage_path}{thumbnail_name}" if thumbnail_path else None,
            description=description,
            tags=tags or [],
        )

        # ✅ Duration via ffprobe
        try:
            result = subprocess.run(
                [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    full_path
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            duration = float(result.stdout.strip())
        except Exception as e:
            print("⚠️ Failed to get video duration:", e)
            duration = 0.0

        # ✅ Create initial segment
        VideoSegment.objects.create(
            video=video,
            source_start=0.0,
            source_end=duration,
            question_card=None,
        )
        print(f"🎬 Created base segment [0, {duration}] for video {video.id}")

        # ✅ Invalidate caches
        cache.delete_pattern(f"user_videos:*:{organization.id}:*")
        cache.delete_pattern(f"org_videos:*:{organization.id}*")

        # ✅ Broadcast org update → "create"
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"org_{organization.id}_updates",
            {
                "type": "org_update",
                "category": "video",
                "action": "create",
                "payload": {"id": str(video.id)},
            },
        )

        print(f"📢 Sent org_update:create for org_{organization.id}")

        # ✅ Return structured response
        return JsonResponse({
            "message": "Video stored successfully.",
            "video_id": video.id,
            "video_name": video.name,
            "storage_path": storage_path,
            "thumbnail_url": video.thumbnail_url,
            "duration": duration,
            "description": description,
            "meeting_id": video.meeting.id if video.meeting else None,  # ✅ added
        }, status=201)

    except Exception as e:
        print("❌ Error in store_video:", e)
        return JsonResponse({"error": str(e)}, status=500)

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def notify_org_update(org_id, category, action, payload=None):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"org_{org_id}_updates",
        {
            "type": "org_update",
            "category": category,   # e.g. "video", "survey", "dataset"
            "action": action,       # e.g. "create", "update", "delete"
            "payload": payload or {},
        },
    )
    
@csrf_exempt
@login_required
def delete_video(request, video_id):
    """
    Delete a video, its segments, and all associated media files.
    Organization owner or members can delete.
    Broadcasts an org update to notify all clients.
    """
    if request.method != "DELETE":
        return JsonResponse({"error": "Only DELETE requests are allowed."}, status=405)

    try:
        # ✅ Fetch video
        video = Video.objects.filter(id=video_id).select_related("organization").first()
        if not video:
            return JsonResponse({"error": f"Video {video_id} not found."}, status=404)

        org = video.organization
        if not org:
            return JsonResponse({"error": "No organization linked to this video."}, status=400)

        # ✅ Authorization: allow owner or members
        user = request.user
        is_owner = hasattr(org, "owner") and org.owner == user
        is_member = hasattr(org, "members") and user in org.members.all()

        if not (is_owner or is_member):
            print(f"🚫 Unauthorized deletion attempt by {user.email} on org {org.id}")
            return JsonResponse({"error": "You do not have permission to delete this video."}, status=403)

        print(f"🗑️ {user.email} deleting video {video.id} from org {org.id}")

        # ✅ Delete physical files
        def safe_remove_file(url_field_value):
            if not url_field_value:
                return
            rel_path = url_field_value.replace(settings.MEDIA_URL, "")
            abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
            if os.path.exists(abs_path):
                os.remove(abs_path)
                print(f"🧹 Deleted file: {abs_path}")

        safe_remove_file(video.url)
        safe_remove_file(video.thumbnail_url)

        # ✅ Delete DB record
        video.delete()

        # ✅ Invalidate cache
        user_email = request.user.email
        cache.delete_pattern(f"user_videos:{user_email}:{org.id}:*")
        cache.delete_pattern(f"org_videos:*:{org.id}*") 

        # ✅ Broadcast update via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"org_{org.id}_updates",
            {
                "type": "org_update",
                "category": "video",
                "action": "delete",
                "payload": {"id": video_id},
            },
        )

        print(f"📢 Sent org_update:delete for org_{org.id}")
        return JsonResponse({"message": f"Video {video_id} deleted successfully."}, status=200)

    except Exception as e:
        print("❌ Error deleting video:", e)
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@login_required
def get_user_videos(request, org_id, meeting_name):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        user_email = request.user.email
        cache_key = f"user_videos:{user_email}:{org_id}:{meeting_name}"

        # ✅ Try Redis cache first
        cached = cache.get(cache_key)
        if cached:
            print(f"📦 Cache hit for {cache_key}")
            return JsonResponse({"videos": cached, "cached": True}, status=200)

        print(f"❌ Cache miss for {cache_key}, fetching from DB")

        # ✅ Validate org + meeting
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        meeting = Meeting.objects.filter(name=meeting_name, organization=organization).first()
        if not meeting:
            return JsonResponse({"error": f"Meeting '{meeting_name}' not found."}, status=404)

        # ✅ Prefetch segments and question cards
        videos = (
            Video.objects.filter(meeting=meeting, organization=organization)
            .prefetch_related("segments__question_card")
            .order_by("-created_at")
        )

        videos_list = []
        for video in videos:
            segments_data = []
            for segment in video.segments.all():
                q_data = None
                if segment.question_card:
                    qc = segment.question_card
                    q_data = {
                        "id": str(qc.id),
                        "question": qc.question,
                        "answers": qc.answers,
                        "difficulty": qc.difficulty,
                        "type": qc.type,
                        "displayType": qc.display_type,
                        "showWinner": qc.show_winner,
                        "live": qc.live,
                    }

                segments_data.append({
                    "id": str(segment.id),
                    "source": [segment.source_start, segment.source_end],
                    "isQuestionCard": bool(segment.question_card),
                    "questionCardData": q_data,
                })

            full_video_url = request.build_absolute_uri(video.url)
            full_thumbnail_url = (
                request.build_absolute_uri(video.thumbnail_url)
                if video.thumbnail_url else None
            )

            videos_list.append({
                "id": str(video.id),
                "videoName": video.name or "Untitled Video",
                "videoTags": video.tags or [],
                "videoLength": sum(
                    s.source_end - s.source_start for s in video.segments.all()
                ),
                "questionCards": segments_data,
                "savedAt": video.created_at.isoformat(),
                "videoUrl": full_video_url,
                "thumbnail_url": full_thumbnail_url,
                "organization_id": str(video.organization.id),
                "individual": True,
                "associated_meeting_id": str(video.meeting.id) if video.meeting else None,  # ✅ added
            })

        cache.set(cache_key, videos_list, timeout=600)

        print(f"🎥 Returning {len(videos_list)} user videos with meeting IDs")
        return JsonResponse({"videos": videos_list, "cached": False}, status=200)

    except Exception as e:
        print("❌ Error in get_user_videos:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@login_required
def get_org_videos(request, org_id):
    """
    Fetch all videos belonging to an organization, across all meetings.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        user_email = request.user.email
        cache_key = f"org_videos:{user_email}:{org_id}"

        # ✅ Try Redis cache
        cached = cache.get(cache_key)
        if cached:
            print(f"📦 Cache hit for {cache_key}")
            return JsonResponse({"videos": cached, "cached": True}, status=200)

        print(f"❌ Cache miss for {cache_key}, fetching from DB")

        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        videos = (
            Video.objects.filter(organization=organization)
            .prefetch_related("segments__question_card", "meeting")
            .order_by("-created_at")
        )

        videos_list = []
        for video in videos:
            segments_data = []
            for segment in video.segments.all():
                q_data = None
                if segment.question_card:
                    qc = segment.question_card
                    q_data = {
                        "id": str(qc.id),
                        "question": qc.question,
                        "answers": qc.answers,
                        "difficulty": qc.difficulty,
                        "type": qc.type,
                        "displayType": qc.display_type,
                        "showWinner": qc.show_winner,
                        "live": qc.live,
                    }

                segments_data.append({
                    "id": str(segment.id),
                    "source": [segment.source_start, segment.source_end],
                    "isQuestionCard": bool(segment.question_card),
                    "questionCardData": q_data,
                })

            full_video_url = request.build_absolute_uri(video.url)
            full_thumbnail_url = (
                request.build_absolute_uri(video.thumbnail_url)
                if video.thumbnail_url else None
            )

            videos_list.append({
                "id": str(video.id),
                "videoName": video.name or "Untitled Video",
                "videoTags": video.tags or [],
                "videoLength": sum(
                    s.source_end - s.source_start for s in video.segments.all()
                ),
                "questionCards": segments_data,
                "savedAt": video.created_at.isoformat(),
                "videoUrl": full_video_url,
                "thumbnail_url": full_thumbnail_url,
                "organization_id": str(video.organization.id),
                "individual": False,
                "meetingName": video.meeting.name if video.meeting else None,
                "associated_meeting_id": str(video.meeting.id) if video.meeting else None,  # ✅ added
            })

        cache.set(cache_key, videos_list, timeout=600)

        print(f"🏢 Returning {len(videos_list)} org videos with meeting IDs")
        return JsonResponse({"videos": videos_list, "cached": False}, status=200)

    except Exception as e:
        print("❌ Error in get_org_videos:", e)
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@login_required
def store_currently_playing(request, meeting_name):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    try:
        data = json.loads(request.body)
        url = data.get("url")

        if not url:
            return JsonResponse({"error": "Missing 'url' in request body."}, status=400)

        meeting = Meeting.objects.filter(name=meeting_name, owner=request.user).first()
        if not meeting:
            return JsonResponse({"error": "Meeting not found."}, status=404)

        meeting.currently_playing = url
        meeting.save(update_fields=["currently_playing"])

        return JsonResponse({
            "message": "Currently playing URL updated.",
            "currently_playing": url,
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@login_required
def update_bot(request, meeting_name):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        user = request.user
        bot_id = request.POST.get("bot_id")

        if not bot_id:
            return JsonResponse({"error": "Missing bot_id in request"}, status=400)

        # Find meeting
        meeting = Meeting.objects.filter(name=meeting_name, owner=user).first()
        if not meeting:
            return JsonResponse({"error": "Meeting not found or not owned by user"}, status=404)

        # Find bot in that meeting
        bot = Bot.objects.filter(meeting=meeting, identifier=bot_id).first()
        if not bot:
            return JsonResponse({"error": "Bot not found in this meeting"}, status=404)

        # Fields to update
        name = request.POST.get("name")
        memory = request.POST.get("memory")
        answers = request.POST.get("answers")

        updated_fields = {}

        if name is not None:
            bot.name = name
            updated_fields["name"] = name

        if memory is not None:
            bot.memory = memory
            updated_fields["memory"] = memory

        if answers is not None:
            try:
                bot.answers = json.loads(answers)
                updated_fields["answers"] = bot.answers
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON in answers"}, status=400)

        if not updated_fields:
            return JsonResponse({"message": "No changes submitted."})

        bot.save()

        return JsonResponse({
            "message": "Bot updated successfully",
            "updated_fields": updated_fields,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

def get_bot_names_and_videos(request, meeting_name):
    try:
        meeting = Meeting.objects.get(name=meeting_name)
        bots = Bot.objects.filter(meeting=meeting)

        data = [
            {
                "name": bot.name,
                "video_url": bot.video_url,
            }
            for bot in bots
        ]

        return JsonResponse({"bots": data}, status=200)

    except Meeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

@require_POST
@csrf_exempt
def join_room(request, org_id, meeting_name):
    COOKIE_MAX_AGE = 12 * 60 * 60  # 12 hours in seconds
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "message": "Invalid JSON body."}, status=400)

    owner_email = (body.get("owner_email") or "").strip().lower()
    name = (body.get("name") or "").strip()

    if not owner_email or not name:
        return JsonResponse({
            "ok": False,
            "message": "Missing required fields: owner_email or name."
        }, status=400)

    # ✅ Manual org + meeting lookup
    org = Organization.objects.filter(id=org_id).first()
    if org is None:
        return JsonResponse({"ok": False, "message": "Organization not found."}, status=404)

    meeting = Meeting.objects.filter(organization=org, name=meeting_name).first()
    if meeting is None:
        return JsonResponse({"ok": False, "message": "Meeting not found."}, status=404)

    # ✅ Email match check
    actual_email = (meeting.owner.email or "").strip().lower()
    if actual_email != owner_email:
        return JsonResponse({
            "ok": False,
            "message": "Owner email does not match meeting owner."
        }, status=403)

    # ✅ Compose Redis key from name
    safe_name = name.lower().replace(" ", "_")
    redis_key = f"join_room:{org_id}:{meeting_name}:{safe_name}"

    # ✅ Cache for 12 hours
    cache.set(redis_key, True, timeout=COOKIE_MAX_AGE)

    # ✅ JSON response
    response = JsonResponse({
        "ok": True,
        "message": "Access verified and stored for 12 hours.",
    })

    # ✅ Secure HttpOnly cookie
    response.set_cookie(
        key=f"join_auth_{org_id}_{meeting_name}",
        value=safe_name,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="Lax",
        path="/",
    )

    return response

@csrf_exempt
def get_meeting_owner(request, org_id, meeting_name):
    try:
        meeting = Meeting.objects.get(name=meeting_name, organization_id=org_id)
    except Meeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

    owner = meeting.owner
    owner_name = owner.first_name or owner.email.split("@")[0]

    if hasattr(owner, "profile") and owner.profile.profile_picture:
        owner_picture = owner.profile.profile_picture.url
    else:
        owner_picture = (
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93"
            "?fit=crop&w=400&q=80"
        )

    return JsonResponse({
        "meeting": meeting.name,
        "owner_id": owner.id,
        "owner_username": owner.username,
        "owner_email": owner.email,
        "owner_name": owner_name,
        "owner_picture": owner_picture,
    })

@csrf_exempt
def save_survey(request, meeting_name):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        survey_id = data["id"]
        items = data["items"]

        meeting = Meeting.objects.get(name=meeting_name)

        survey = Survey.objects.create(
            id=survey_id,
            meeting=meeting,
            items=items
        )

        return JsonResponse({"success": True, "survey_id": str(survey.id)})

    except Meeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

    except KeyError:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def get_survey(request, meeting_name, survey_id):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        survey = Survey.objects.get(id=survey_id, meeting__name=meeting_name)

        return JsonResponse({
            "success": True,
            "survey": {
                "id": str(survey.id),
                "meeting_id": survey.meeting.id,
                "items": survey.items
            }
        })

    except Survey.DoesNotExist:
        return JsonResponse({"error": "Survey not found"}, status=404)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
    

CACHE_TIMEOUT = 60 * 5  # 5 minutes

@csrf_exempt
@login_required
def create_question_card(request, org_id, meeting_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    try:
        data = json.loads(request.body)

        # ✅ Validate organization
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        # ✅ Validate meeting
        meeting = Meeting.objects.filter(id=meeting_id, organization=organization).first()
        if not meeting:
            return JsonResponse({"error": f"Meeting {meeting_id} not found in this organization."}, status=404)

        # ✅ Extract fields
        question = data.get("question", "").strip()
        answers = data.get("answers", [])
        correct_answers = data.get("correctAnswers", None)  # 👈 NEW
        difficulty = data.get("difficulty", "").lower()
        qtype = data.get("type", "").lower()
        display_type = data.get("displayType", None)
        show_winner = data.get("showWinner", None)
        live = data.get("live", None)
        
        print(correct_answers)

        # ✅ Basic validation
        if not question or not answers or not difficulty or not qtype:
            return JsonResponse({"error": "Missing required fields."}, status=400)

        # ✅ Create QuestionCard with correct_answers
        qc = QuestionCard.objects.create(
            user=request.user,
            organization=organization,
            meeting=meeting,
            question=question,
            answers=answers,
            correct_answers=correct_answers,  # 👈 ADDED HERE
            difficulty=difficulty,
            type=qtype,
            display_type=display_type,
            show_winner=show_winner,
            live=live,
        )
        

        print(f"🆕 Created QuestionCard {qc.id} for meeting {meeting.id} / org {organization.id}")

        # 🧹 Invalidate cache
        cache_key = f"org_question_cards:{org_id}"
        cache.delete(cache_key)

        # 📢 WebSocket broadcast
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"org_{organization.id}_updates",  # ✅ FIXED to match Video pattern
                {
                    "type": "org_update",
                    "category": "question",
                    "action": "create",
                    "payload": {"id": str(qc.id)},
                },
            )
            print(f"📡 Sent WS create event for QuestionCard {qc.id} (org {org_id})")
        except Exception as e:
            print("⚠️ Failed to broadcast WS create event:", e)

        return JsonResponse(
            {
                "message": "QuestionCard created successfully.",
                "question_id": qc.id,
                "meeting_id": meeting.id,
                "organization_id": organization.id,
                "correct_answers": qc.correct_answers,
            },
            status=201,
        )

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        print("❌ Error in create_question_card:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_POST
def store_quatric_survey_answers(request, org_id, room_name):
    """
    Stores participant survey answers for a given meeting.
    Uses the same join_room cache key namespace and expires after 12h.
    """
    COOKIE_MAX_AGE = 12 * 60 * 60  # 12 hours
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    participant_name = data.get("participant_name")
    answers = data.get("answers")

    if not participant_name or not isinstance(answers, dict):
        return JsonResponse(
            {"ok": False, "message": "Missing participant_name or answers"},
            status=400
        )

    # ✅ Reuse join_room cache namespace
    safe_name = participant_name.lower().replace(" ", "_")
    redis_key = f"join_room:{org_id}:{room_name}:{safe_name}:Qualtric_survey_answers"

    print("stored_in", redis_key)
    # ✅ Each answer stored as timestamped log entries
    existing = cache.get(redis_key, [])
    if not isinstance(existing, list):
        existing = []

    entry = {
        "timestamp": now().isoformat(),
        "answers": answers
    }
    existing.append(entry)
    cache.set(redis_key, existing, timeout=COOKIE_MAX_AGE)

    return JsonResponse({"ok": True, "message": "Survey answers stored", "entry": entry})

@csrf_exempt
@require_POST
def store_video_question_answers(request, org_id, room_name, question_id):
    """
    Stores or replaces participant answers for a specific video question.
    Cache key is scoped to org, room, participant, and question ID.
    Replaces any previous answer for that question instead of appending.
    """
    COOKIE_MAX_AGE = 12 * 60 * 60  # 12 hours

    # ✅ Parse JSON body safely
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    participant_name = data.get("participant_name")
    answers = data.get("answers")

    if not participant_name or not isinstance(answers, dict):
        return JsonResponse(
            {"ok": False, "message": "Missing participant_name or answers"},
            status=400
        )

    # ✅ Build Redis key per participant & question
    safe_name = participant_name.lower().replace(" ", "_")
    redis_key = f"video_question:{org_id}:{room_name}:{safe_name}:{question_id}:answers"

    # ✅ Replace any previous entries — store only the latest answer
    entry = {
        "timestamp": now().isoformat(),
        "answers": answers
    }

    cache.set(redis_key, [entry], timeout=COOKIE_MAX_AGE)

    print(f"✅ Stored (replaced) in {redis_key}")
    return JsonResponse({
        "ok": True,
        "message": "Video question answer stored (replaced previous entry)",
        "entry": entry
    })

@csrf_exempt
def get_all_video_question_answers(request, org_id, room_name):
    """
    Returns all stored video question answers for a given meeting across all participants and question IDs.
    """
    try:
        # Example key pattern: video_question:{org_id}:{room_name}:{safe_name}:{question_id}:answers
        keys = cache.keys(f"video_question:{org_id}:{room_name}:*:*:answers")
        print("🎯 Video question keys found:", keys)

        if not keys:
            return JsonResponse({
                "ok": True,
                "message": "No stored video question answers found for this room.",
                "participants": []
            })

        results = []
        for key in keys:
            parts = key.split(":")
            if len(parts) < 6:
                continue  # skip malformed keys

            safe_name = parts[3]
            question_id = parts[4]
            data = cache.get(key)

            results.append({
                "participant": safe_name.replace("_", " "),
                "question_id": question_id,
                "count": len(data) if isinstance(data, list) else 0,
                "answers": data or []
            })

        return JsonResponse({
            "ok": True,
            "org_id": org_id,
            "room_name": room_name,
            "total_participants": len({r["participant"] for r in results}),
            "total_entries": len(results),
            "participants": results
        })

    except Exception as e:
        print("❌ Error in get_all_video_question_answers:", e)
        return JsonResponse({
            "ok": False,
            "message": f"Error retrieving video question answers: {str(e)}"
        }, status=500)

@csrf_exempt
def get_all_quatric_survey_answers(request, org_id, room_name):
    """
    Returns all stored Qualtrics survey answers for a given meeting across all participants.
    """
    try:
        # redis = get_redis_connection("default")  # "default" cache alias from settings.py
        # pattern = f"join_room:{org_id}:{room_name}:*:Qualtric_survey_answers"

        keys = cache.keys(f"join_room:{org_id}:{room_name}:*:Qualtric_survey_answers")

        print("SCANEND KEYS", keys)
        if not keys:
            return JsonResponse({
                "ok": True,
                "message": "No stored survey answers found for this room.",
                "participants": []
            })

        results = []
        for key in keys:
            safe_name = key.split(":")[3]  # extract the safe participant name
            data = cache.get(key)
            results.append({
                "participant": safe_name.replace("_", " "),
                "count": len(data) if isinstance(data, list) else 0,
                "answers": data or []
            })

        return JsonResponse({
            "ok": True,
            "org_id": org_id,
            "room_name": room_name,
            "participant_count": len(results),
            "participants": results
        })

    except Exception as e:
        return JsonResponse({
            "ok": False,
            "message": f"Error retrieving survey answers: {str(e)}"
        }, status=500)


@csrf_exempt
@login_required
def get_all_question_cards(request, org_id):
    """
    Fetch all QuestionCards associated with a given organization (org_id).
    Cached in Redis for 5 minutes.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        user = request.user
        is_owner = hasattr(organization, "owner") and organization.owner == user
        is_member = hasattr(organization, "members") and user in organization.members.all()
        if not (is_owner or is_member):
            return JsonResponse({"error": "User is not part of this organization."}, status=403)

        cache_key = f"org_question_cards:{org_id}"

        # ✅ Check cache first
        cached_data = cache.get(cache_key)
        print(cached_data)
        if cached_data:
            print(f"⚡ Returning cached question cards for org {org_id}")
            return JsonResponse(cached_data, status=200)

        # ✅ Query DB
        question_cards = (
            QuestionCard.objects.filter(organization=organization)
            .select_related("meeting", "organization", "user")
            .order_by("-created_at")
        )

        # ✅ Include correct_answers in the response
        question_list = [
            {
                "id": str(q.id),
                "question": q.question,
                "answers": q.answers,
                "correctAnswers": q.correct_answers,  # 👈 NEW FIELD
                "difficulty": q.difficulty,
                "type": q.type,
                "displayType": q.display_type,
                "showWinner": q.show_winner,
                "live": q.live,
                "organization_id": str(q.organization.id) if q.organization else None,
                "meeting_id": str(q.meeting.id) if q.meeting else None,
                "created_at": q.created_at.isoformat(),
                "user_email": q.user.email if q.user else None,
            }
            for q in question_cards
        ]
        
          # 🧩 DEBUG LOG: Verify correctAnswers in serialized output
        print("🧩 [DEBUG] Serialized question list preview:")
        for q in question_list:
            print(f"  • ID={q['id']} | correctAnswers={q['correctAnswers']} | "
                  f"answers={q['answers']} | question={q['question']}")

        response_data = {"questions": question_list, "count": len(question_list)}

        # ✅ Cache it
        cache.set(cache_key, response_data, CACHE_TIMEOUT)
        print(f"💾 Cached {len(question_list)} question cards for org {org_id}")

        return JsonResponse(response_data, status=200)

    except Exception as e:
        print("❌ Error in get_all_question_cards:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@login_required
def delete_question_card(request, question_id):
    try:
        question = QuestionCard.objects.get(id=question_id)
        user = request.user
        org = question.organization

        has_permission = (
            question.user == user
            or (org and (org.owner == user or org.members.filter(id=user.id).exists()))
        )
        if not has_permission:
            return JsonResponse(
                {"error": "You do not have permission to delete this question card."},
                status=403,
            )

        question.delete()
        print(f"🗑️ Deleted QuestionCard {question_id} by {user.username}")

        if org:
            cache_key = f"org_question_cards:{org.id}"
            cache.delete(cache_key)

        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"org_{org.id}_updates",  # ✅ match Video + Question create pattern
                {
                    "type": "org_update",
                    "category": "question",
                    "action": "delete",
                    "payload": {"id": str(question_id)},
                },
            )
            print(f"📡 Sent WS delete event for QuestionCard {question_id} (org {org.id})")
        except Exception as e:
            print("⚠️ Failed to broadcast WS delete event:", e)

        return JsonResponse(
            {"message": f"QuestionCard {question_id} deleted successfully."},
            status=200,
        )

    except QuestionCard.DoesNotExist:
        return JsonResponse({"error": f"QuestionCard with id {question_id} not found."}, status=404)
    except Exception as e:
        print("🔥 DELETE QUESTION ERROR:", str(e))
        return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
@login_required
def get_question_card_by_id(request, question_id):
    """
    Fetch a single QuestionCard by ID.
    Cached in Redis for 5 minutes.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        cache_key = f"question_card:{question_id}"

        # ✅ 1. Try cache first
        cached_question = cache.get(cache_key)
        if cached_question:
            print(f"⚡ Returning cached QuestionCard {question_id}")
            return JsonResponse(cached_question, status=200)

        # ✅ 2. Fetch from DB
        question = (
            QuestionCard.objects
            .select_related("meeting", "organization", "user")
            .filter(id=question_id)
            .first()
        )
        if not question:
            return JsonResponse({"error": f"QuestionCard {question_id} not found."}, status=404)

        org = question.organization
        user = request.user
        has_permission = (
            question.user == user
            or (org and (org.owner == user or org.members.filter(id=user.id).exists()))
        )
        if not has_permission:
            return JsonResponse({"error": "You do not have permission to view this question."}, status=403)

        # ✅ 3. Serialize the question
        question_data = {
            "id": str(question.id),
            "question": question.question,
            "answers": question.answers,
            "correctAnswers": question.correct_answers,
            "difficulty": question.difficulty,
            "type": question.type,
            "displayType": question.display_type,
            "showWinner": question.show_winner,
            "live": question.live,
            "organization_id": str(org.id) if org else None,
            "meeting_id": str(question.meeting.id) if question.meeting else None,
            "created_at": question.created_at.isoformat(),
            "user_email": question.user.email if question.user else None,
        }

        # ✅ 4. Cache the result
        cache.set(cache_key, question_data, CACHE_TIMEOUT)
        print(f"💾 Cached QuestionCard {question_id}")

        return JsonResponse(question_data, status=200)

    except Exception as e:
        print(f"❌ Error in get_question_card_by_id({question_id}):", e)
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@login_required
def create_survey(request, org_id, meeting_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    try:
        data = json.loads(request.body)

        # ✅ Validate organization
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        # ✅ Validate meeting
        meeting = Meeting.objects.filter(id=meeting_id, organization=organization).first()
        if not meeting:
            return JsonResponse({"error": f"Meeting {meeting_id} not found in this organization."}, status=404)

        items = data.get("items", [])
        if not isinstance(items, (list, dict)):
            return JsonResponse({"error": "Invalid items format."}, status=400)

        # ✅ Create survey
        survey = Survey.objects.create(
            user=request.user,
            organization=organization,
            meeting=meeting,
            items=items,
        )

        print(f"🆕 Created Survey {survey.id} for meeting {meeting.id} / org {organization.id}")

        # 🧹 Invalidate cache
        cache_key = f"org_surveys:{org_id}"
        cache.delete(cache_key)

        # 📢 WebSocket broadcast
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"org_{organization.id}_updates",
                {
                    "type": "org_update",
                    "category": "survey",
                    "action": "create",
                    "payload": {"id": str(survey.id)},
                },
            )
            print(f"📡 Sent WS create event for Survey {survey.id} (org {org_id})")
        except Exception as e:
            print("⚠️ Failed to broadcast WS create event:", e)

        return JsonResponse(
            {
                "message": "Survey created successfully.",
                "survey_id": str(survey.id),
                "meeting_id": meeting.id,
                "organization_id": organization.id,
            },
            status=201,
        )

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        print("❌ Error in create_survey:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@login_required
def get_all_surveys(request, org_id):
    """
    Fetch all Surveys for a given organization.
    Cached in Redis for 5 minutes.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": f"Organization {org_id} not found."}, status=404)

        user = request.user
        is_owner = hasattr(organization, "owner") and organization.owner == user
        is_member = hasattr(organization, "members") and user in organization.members.all()
        if not (is_owner or is_member):
            return JsonResponse({"error": "User is not part of this organization."}, status=403)

        cache_key = f"org_surveys:{org_id}"

        cached_data = cache.get(cache_key)
        if cached_data:
            print(f"⚡ Returning cached surveys for org {org_id}")
            return JsonResponse(cached_data, status=200)

        surveys = (
            Survey.objects.filter(organization=organization)
            .select_related("organization", "meeting", "user")
            .order_by("-created_at")
        )

        survey_list = [
            {
                "id": str(s.id),
                "items": s.items,
                "organization_id": str(s.organization.id) if s.organization else None,
                "meeting_id": str(s.meeting.id) if s.meeting else None,
                "created_at": s.created_at.isoformat(),
                "user_email": s.user.email if s.user else None,
            }
            for s in surveys
        ]

        response_data = {"surveys": survey_list, "count": len(survey_list)}
        cache.set(cache_key, response_data, CACHE_TIMEOUT)
        print(f"💾 Cached {len(survey_list)} surveys for org {org_id}")

        return JsonResponse(response_data, status=200)

    except Exception as e:
        print("❌ Error in get_all_surveys:", e)
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@login_required
def delete_survey(request, survey_id: int):
    """Delete a survey by ID and broadcast WS event."""
    if request.method != "DELETE":
        return JsonResponse({"error": "Only DELETE requests are allowed."}, status=405)

    try:
        survey = Survey.objects.filter(id=survey_id).first()
        if not survey:
            print(f"⚠️ Survey {survey_id} not found, clearing cache anyway.")
            cache.delete_pattern("org_surveys:*")
            return JsonResponse(
                {"message": f"Survey {survey_id} not found but cache cleared."},
                status=404,
            )

        user = request.user
        org = survey.organization

        # ✅ Check ownership or org-level permission
        has_permission = (
            survey.user == user
            or (org and (org.owner == user or org.members.filter(id=user.id).exists()))
        )
        if not has_permission:
            return JsonResponse(
                {"error": "You do not have permission to delete this survey."},
                status=403,
            )

        survey.delete()
        print(f"🗑️ Deleted Survey {survey_id} by {user.username}")

        # ✅ Clear cache
        if org:
            cache_key = f"org_surveys:{org.id}"
            cache.delete(cache_key)
        cache.delete(f"survey:{survey_id}")

        # ✅ Broadcast WebSocket update
        if org:
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"org_{org.id}_updates",
                    {
                        "type": "org_update",
                        "category": "survey",
                        "action": "delete",
                        "payload": {"id": survey_id},
                    },
                )
                print(f"📡 Sent WS delete event for Survey {survey_id} (org {org.id})")
            except Exception as e:
                print("⚠️ Failed to broadcast WS delete event:", e)

        return JsonResponse({"message": f"Survey {survey_id} deleted successfully."}, status=200)

    except Exception as e:
        print("🔥 DELETE SURVEY ERROR:", str(e))
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def get_survey_by_id(request, survey_id: int):
    """Fetch a single survey by its integer ID."""
    if request.method != "GET":
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)

    try:
        cache_key = f"survey:{survey_id}"
        cached_survey = cache.get(cache_key)
        if cached_survey:
            print(f"⚡ Returning cached Survey {survey_id}")
            return JsonResponse(cached_survey, status=200)

        survey = (
            Survey.objects
            .select_related("organization", "meeting", "user")
            .filter(id=survey_id)
            .first()
        )

        if not survey:
            return JsonResponse({"error": f"Survey {survey_id} not found."}, status=404)

        org = survey.organization
        user = request.user
        has_permission = (
            survey.user == user
            or (org and (org.owner == user or org.members.filter(id=user.id).exists()))
        )
        if not has_permission:
            return JsonResponse({"error": "You do not have permission to view this survey."}, status=403)

        survey_data = {
            "id": survey.id,
            "items": survey.items,
            "organization_id": org.id if org else None,
            "meeting_id": survey.meeting.id if survey.meeting else None,
            "created_at": survey.created_at.isoformat(),
            "user_email": survey.user.email if survey.user else None,
        }

        cache.set(cache_key, survey_data, CACHE_TIMEOUT)
        print(f"💾 Cached Survey {survey_id}")

        return JsonResponse(survey_data, status=200)

    except Exception as e:
        print(f"❌ Error in get_survey_by_id({survey_id}):", e)
        return JsonResponse({"error": str(e)}, status=500)
    

# ============================================================
# ✅ Utility: check org membership (owner or member)
# ============================================================
def user_in_org(user, org):
    if not org:
        return False
    return (hasattr(org, "owner") and org.owner == user) or \
           (hasattr(org, "members") and user in org.members.all())

# ============================================================
# ✅ STORE BOT
# ============================================================
@csrf_exempt
@login_required
def store_bot(request, org_id, meeting_name):
    """Create and store a new Bot with optional video and thumbnail."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        user = request.user
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": "Organization not found"}, status=404)
        if not user_in_org(user, organization):
            return JsonResponse({"error": "User not part of this organization"}, status=403)

        meeting = Meeting.objects.filter(name=meeting_name, organization=organization).first()
        if not meeting:
            return JsonResponse({"error": "Meeting not found"}, status=404)

        data = request.POST
        name = data.get("name")
        memory = data.get("memory", "")
        answers_raw = data.get("answers", "[]")
        video_file = request.FILES.get("video")

        if not name:
            return JsonResponse({"error": "Missing required field: name"}, status=400)

        try:
            answers = json.loads(answers_raw)
        except json.JSONDecodeError:
            answers = []

        video_url, image_url = None, None

        # ✅ Save video and generate thumbnail
# ✅ Save video and generate thumbnail
        if video_file:
            user_email = user.email or "unknown_user"
            safe_meeting = meeting_name.replace("/", "_")

            base_storage_path = os.path.join("bot_videos", user_email, safe_meeting)
            os.makedirs(os.path.join(settings.MEDIA_ROOT, base_storage_path), exist_ok=True)

            file_root, file_ext = os.path.splitext(video_file.name)
            counter = 1
            final_name = video_file.name
            full_path = os.path.join(settings.MEDIA_ROOT, base_storage_path, final_name)

            while os.path.exists(full_path):
                final_name = f"{file_root}_{counter}{file_ext}"
                full_path = os.path.join(settings.MEDIA_ROOT, base_storage_path, final_name)
                counter += 1

            storage_path = os.path.join(base_storage_path, final_name)
            with open(full_path, "wb+") as dest:
                for chunk in video_file.chunks():
                    dest.write(chunk)

            # ✅ Store only the relative path in the DB
            relative_video_path = storage_path.replace("\\", "/")

            # ✅ Build full URL only for response
            video_url = request.build_absolute_uri(
                os.path.join(settings.MEDIA_URL, relative_video_path)
            ).replace("\\", "/")

            # ✅ Generate thumbnail
            thumbnail_name = f"{file_root}_thumb.jpg"
            thumbnail_path = os.path.join(settings.MEDIA_ROOT, base_storage_path, thumbnail_name)
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", full_path, "-ss", "00:00:01.000",
                    "-vframes", "1", "-q:v", "2", thumbnail_path
                ], check=True)
                image_url = request.build_absolute_uri(
                    os.path.join(settings.MEDIA_URL, base_storage_path, thumbnail_name)
                ).replace("\\", "/")
            except subprocess.CalledProcessError:
                image_url = None

        # ✅ Create the Bot with *relative* video path
        bot = Bot.objects.create(
            user=user,
            organization=organization,
            meeting=meeting,
            name=name,
            memory=memory,
            answers=answers,
            video_url=relative_video_path,  # <— store RELATIVE path
        )

        if image_url:
            rel_image_path = image_url.replace(request.build_absolute_uri(settings.MEDIA_URL), "")
            bot.image = rel_image_path
            bot.save(update_fields=["image"])

        # ✅ Full cache payload (no truncation)
        bot_data = {
            "id": bot.id,
            "name": bot.name,
            "memory": bot.memory,
            "answers": bot.answers,
            "video_url": bot.video_url,
            "image_url": image_url,
            "organization_id": organization.id,
            "meeting_id": meeting.id,
        }

        cache.set(f"bot:{bot.id}", bot_data, timeout=600)
        cache.delete(f"org_bots:{organization.id}")  # invalidate org cache

        # ✅ WebSocket broadcast
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"org_{organization.id}_updates",
            {
                "type": "org_update",
                "category": "bot",
                "action": "create",
                "payload": {"id": bot.id},
            },
        )

        return JsonResponse({
            "message": "Bot stored successfully",
            "bot_id": bot.id,
            **bot_data,  # send full data back to client
        }, status=201)

    except Exception as e:
        print("🔥 store_bot error:", e)
        return JsonResponse({"error": str(e)}, status=500)

# ============================================================
# ✅ EDIT BOT
# ============================================================
@csrf_exempt
@login_required
def edit_bot(request, bot_id, org_id, room_name):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        user = request.user
        bot = Bot.objects.select_related("organization", "meeting").filter(id=bot_id).first()
        if not bot:
            return JsonResponse({"error": "Bot not found"}, status=404)
        if not user_in_org(user, bot.organization):
            return JsonResponse({"error": "Not authorized"}, status=403)

        data = json.loads(request.body)
        bot.name = data.get("name", bot.name)
        bot.memory = data.get("memory", bot.memory)
        bot.answers = data.get("answers", bot.answers)
        bot.save()

        # ✅  Build *complete* cached payload
        bot_data = {
            "id": bot.id,
            "name": bot.name,
            "memory": bot.memory,
            "answers": bot.answers,
            "video_url": bot.video_url,
            "image_url": bot.image.url if bot.image else None,
            "organization_id": bot.organization.id if bot.organization else None,
            "meeting_id": bot.meeting.id if bot.meeting else None,
        }

        # ✅  Overwrite full cache entry
        cache.set(f"bot:{bot.id}", bot_data, timeout=600)
        cache.delete(f"org_bots:{bot.organization.id}")  # invalidate org cache

        # ✅  Broadcast update
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"org_{bot.organization.id}_updates",
            {
                "type": "org_update",
                "category": "bot",
                "action": "update",
                "payload": {"id": bot.id},
            },
        )
        
        # update for active meeting
        cache_key = f"active_meeting:{org_id}:{room_name}"
        existing = cache.get(cache_key)
        group_name = f"meeting_{org_id}_{room_name}"
        async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "meeting_state_changed",
                    "state": existing,
                }
            )
        
        return JsonResponse({"message": "Bot updated", "bot_id": bot.id}, status=200)

    except Exception as e:
        print("🔥 edit_bot error:", e)
        return JsonResponse({"error": str(e)}, status=500)

# ============================================================
# ✅ DELETE BOT
# ============================================================
@csrf_exempt
@login_required
def delete_bot(request, bot_id):
    if request.method not in ["DELETE", "POST"]:
        return JsonResponse({"error": "DELETE or POST required"}, status=405)

    try:
        user = request.user
        bot = Bot.objects.filter(id=bot_id).first()
        if not bot:
            return JsonResponse({"error": "Bot not found"}, status=404)
        if not user_in_org(user, bot.organization):
            return JsonResponse({"error": "Unauthorized"}, status=403)

        # ✅ Delete files
        if bot.image and os.path.isfile(bot.image.path):
            os.remove(bot.image.path)
        if bot.video_url and bot.video_url.startswith(settings.MEDIA_URL):
            rel = bot.video_url.replace(settings.MEDIA_URL, "").lstrip("/")
            abs_path = os.path.join(settings.MEDIA_ROOT, rel)
            if os.path.isfile(abs_path):
                os.remove(abs_path)

        cache.delete(f"bot:{bot.id}")
        org_id = bot.organization.id if bot.organization else None
        bot.delete()

        # ✅ Broadcast
        if org_id:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"org_{org_id}_updates",
                {
                    "type": "org_update",
                    "category": "bot",
                    "action": "delete",
                    "payload": {"id": bot_id},
                },
            )

        return JsonResponse({"message": "Bot deleted successfully"})
    except Exception as e:
        print("🔥 delete_bot error:", e)
        return JsonResponse({"error": str(e)}, status=500)


# ============================================================
# ✅ GET BOT BY ID
# ============================================================
@login_required
def get_bot_by_id(request, bot_id):
    try:
        redis_key = f"bot:{bot_id}"
        cached = cache.get(redis_key)
        if cached:
            return JsonResponse({"cached": True, "bot": cached})

        bot = Bot.objects.filter(id=bot_id).first()
        if not bot:
            return JsonResponse({"error": "Bot not found"}, status=404)
        if not user_in_org(request.user, bot.organization):
            return JsonResponse({"error": "Unauthorized"}, status=403)

        # ✅ Build safe absolute URLs
        video_url = None
        if bot.video_url:
            # if stored as relative (no http, no /media/ prefix)
            if not bot.video_url.startswith("http") and not bot.video_url.startswith("/media/"):
                video_url = request.build_absolute_uri(
                    os.path.join(settings.MEDIA_URL, bot.video_url)
                ).replace("\\", "/")
            else:
                video_url = request.build_absolute_uri(bot.video_url).replace("\\", "/")

        image_url = (
            request.build_absolute_uri(bot.image.url).replace("\\", "/")
            if bot.image
            else None
        )

        bot_data = {
            "id": bot.id,
            "name": bot.name,
            "memory": bot.memory,
            "answers": bot.answers,
            "video_url": video_url,
            "image_url": image_url,
            "organization_id": bot.organization.id if bot.organization else None,
            "meeting_id": bot.meeting.id if bot.meeting else None,
        }

        cache.set(redis_key, bot_data, timeout=600)
        return JsonResponse({"cached": False, "bot": bot_data})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ============================================================
# ✅ GET ALL BOTS (for org)
# ============================================================
@csrf_exempt
def get_all_bots(request, org_id):
    try:
        user = request.user
        organization = Organization.objects.filter(id=org_id).first()
        if not organization:
            return JsonResponse({"error": "Organization not found"}, status=404)
        if not user_in_org(user, organization):
            return JsonResponse({"error": "Unauthorized"}, status=403)

        redis_key = f"org_bots:{org_id}"
        cached = cache.get(redis_key)
        if cached:
            return JsonResponse({"cached": True, "bots": cached})

        bots = Bot.objects.filter(organization=organization).select_related("meeting")
        bot_list = []

        for bot in bots:
            # ✅ Normalize video URL
            video_url = None
            if bot.video_url:
                if not bot.video_url.startswith("http") and not bot.video_url.startswith("/media/"):
                    video_url = request.build_absolute_uri(
                        os.path.join(settings.MEDIA_URL, bot.video_url)
                    ).replace("\\", "/")
                else:
                    video_url = request.build_absolute_uri(bot.video_url).replace("\\", "/")

            # ✅ Normalize image URL
            image_url = (
                request.build_absolute_uri(bot.image.url).replace("\\", "/")
                if bot.image
                else None
            )
            
            print("IMAGE URL", image_url)
            print("video_URL", video_url)
            bot_list.append({
                "id": bot.id,
                "name": bot.name,
                "memory": bot.memory,
                "answers": bot.answers,
                "video_url": video_url,
                "image_url": image_url,
                "meeting_id": bot.meeting.id if bot.meeting else None,
                "meeting_name": bot.meeting.name if bot.meeting else None,
            })

        cache.set(redis_key, bot_list, timeout=600)
        return JsonResponse({"cached": False, "bots": bot_list})

    except Exception as e:
        print("🔥 get_all_bots error:", e)
        return JsonResponse({"error": str(e)}, status=500)
    

# def _get_key(org_id: int, meeting_id: int) -> str:
#     """Helper for consistent key naming."""
#     return f"active_meeting:{org_id}:{meeting_id}"

@login_required
@csrf_exempt
def update_or_create_active_meeting(request, org_id, room_name):
    print(f"🟡 [update_or_create_active_meeting] Called for org={org_id}, room={room_name}")

    if request.method != "POST":
        print("❌ Invalid request method:", request.method)
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
        print(f"📥 Incoming data: {data}")

        cache_key = f"active_meeting:{org_id}:{room_name}"

        # ✅ Ensure structure always exists
        existing = cache.get(cache_key)
        if not isinstance(existing, dict):
            print(f"⚠️ Cache for {cache_key} invalid or missing. Resetting...")
            existing = {
                "org_id": int(org_id),
                "room_name": str(room_name),
                "active_bot_ids": [],
                "active_video_id": None,
                "active_survey_id": None,
                "last_updated": now().isoformat(),
            }

        print(f"🧩 Before update: {existing}")

        # Extract incoming fields
        bot_ids = data.get("active_bot_ids")
        video_id = data.get("active_video_id")
        survey_id = data.get("active_survey_id")

        print(f"➡️ Incoming fields: bot_ids={bot_ids}, video_id={video_id}, survey_id={survey_id}")

        # ✅ Only update real fields (not "djsut")
        if bot_ids != "djsut":
            existing["active_bot_ids"] = bot_ids or []
        if video_id != "djsut":
            existing["active_video_id"] = video_id
        if survey_id != "djsut":
            existing["active_survey_id"] = survey_id

        existing["last_updated"] = now().isoformat()

        # ✅ Store in cache
        cache.set(cache_key, existing, timeout=60 * 60 * 10) 
        print(f"💾 Cache updated for key={cache_key}: {existing}")

        # ✅ Broadcast to WebSocket group
        try:
            channel_layer = get_channel_layer()
            group_name = f"meeting_{org_id}_{room_name}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "meeting_state_changed",
                    "state": existing,
                }
            )
            print(f"📡 Broadcasted meeting_state_changed to {group_name}")
        except Exception as e:
            print(f"⚠️ Failed to broadcast meeting_state_changed: {e}")

        return JsonResponse({
            "message": "Active meeting updated successfully",
            "data": existing,
        })

    except json.JSONDecodeError:
        print("❌ JSON decode error — invalid request body")
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        print(f"🔥 Exception in update_or_create_active_meeting: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)
    
@csrf_exempt
@login_required
def generate_answers_bot(request, bot_id, org_id, room_name):
    print(f"🟡 [generate_answers_bot] Called for bot_id={bot_id}, org={org_id}, room={room_name}")
    
    try:
        bot = Bot.objects.filter(id=bot_id, organization__id=org_id).first()
        if not bot:
            print(f"❌ Bot {bot_id} not found in org {org_id}")
            return JsonResponse({"error": "Bot not found"}, status=404)

        # 🔹 Get meeting info from cache
        cache_key = f"active_meeting:{org_id}:{room_name}"
        existing = cache.get(cache_key)
        active_video_id = existing.get("active_video_id") if existing else None
        print(f"🟩 Active video ID from cache: {active_video_id}")

        if not active_video_id:
            return JsonResponse({"error": "Active video not found"}, status=400)

        data = json.loads(request.body)
        bot_memory = data.get("bot_memory", "")

        # 🎥 Fetch all segments for the active video
        video_segments = VideoSegment.objects.filter(video__id=active_video_id)

        segment_data = []
        for segment in video_segments:
            if segment.question_card:
                qc = segment.question_card
                segment_data.append({
                    "id": qc.id,  # ✅ store question ID
                    "question": qc.question,
                    "answers": qc.answers,
                    "type": qc.type,
                })

        final_answers = []
        for seg in segment_data:
            generated = SmartBotAnswerEngine.generate_simple_answers(
                question=seg["question"],
                answers=seg["answers"],
                question_type=seg["type"],
                bot_memory=bot_memory,
            )

            if generated:
                final_answers.append({
                    "question_id": seg["id"],  # ✅ store ID, not text
                    "answers": generated,
                })

        # ✅ Store the final answers
        bot.answers = final_answers
        bot.save(update_fields=["answers"])

        print(f"💾 Saved {len(final_answers)} generated answers for bot {bot.id}")

        return JsonResponse({
            "ok": True,
            "bot_id": bot.id,
            "answers": final_answers,
        })

    except json.JSONDecodeError:
        print("❌ JSON decode error — invalid request body")
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        print(f"🔥 Exception in generate_answers_bot: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)

@csrf_exempt
def get_active_bots_video_name(request, org_id, room_name):
    """
    Fetches the active bots (from cached active meeting)
    and returns a list of {name, video_url}.
    """
    print(f"🟦 [get_active_bots_video_name] Called for org={org_id}, room={room_name}")

    if request.method != "GET":
        print("❌ Invalid request method:", request.method)
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"
        meeting_data = cache.get(cache_key)

        if not meeting_data or "active_bot_ids" not in meeting_data:
            print(f"⚠️ No active bots found in cache for {cache_key}")
            return JsonResponse({"bots": []})

        bot_ids = meeting_data.get("active_bot_ids", [])
        if not bot_ids:
            print("⚠️ Empty active_bot_ids list.")
            return JsonResponse({"bots": []})

        bots_info = []
        for bot_id in bot_ids:
            bot = Bot.objects.filter(id=bot_id, organization__id=org_id).first()
            if not bot:
                continue

            # build safe absolute URL for video
            video_url = None
            if bot.video_url:
                if not bot.video_url.startswith("http") and not bot.video_url.startswith("/media/"):
                    video_url = request.build_absolute_uri(
                        os.path.join(settings.MEDIA_URL, bot.video_url)
                    ).replace("\\", "/")
                else:
                    video_url = request.build_absolute_uri(bot.video_url).replace("\\", "/")

            bots_info.append({
                "name": bot.name,
                "video_url": video_url,
            })

        print(f"✅ Returning {len(bots_info)} bots for org={org_id}, room={room_name}")
        return JsonResponse({"bots": bots_info})

    except Exception as e:
        print(f"🔥 Exception in get_active_bots_video_name: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)

@csrf_exempt
def get_bot_answers(request, org_id, room_name):
    print(f"🟦 [get_bot_answers] Called for org={org_id}, room={room_name}")

    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"
        meeting_data = cache.get(cache_key)

        if not meeting_data or "active_bot_ids" not in meeting_data:
            print(f"⚠️ No active bots found for {cache_key}")
            return JsonResponse({"bots": []})

        bot_ids = meeting_data.get("active_bot_ids", [])
        bots_info = []

        def build_absolute_media_url(field):
            """Convert an ImageField/FileField to a full URL string."""
            if not field:
                return None
            try:
                # 🔹 Use Django's .url property and build full URL
                url = field.url if hasattr(field, "url") else str(field)
                absolute = request.build_absolute_uri(url).replace("\\", "/")
                return absolute
            except Exception as e:
                print(f"⚠️ Could not build media URL for {field}: {e}")
                return None

        for bot_id in bot_ids:
            bot = Bot.objects.filter(id=bot_id, organization__id=org_id).first()
            if not bot:
                continue

            # ✅ Log raw field to confirm
            print(f"BOT IMAGE RAW FIELD: {bot.image}")

            # 🔹 Build full image URL
            img_url = build_absolute_media_url(bot.image)
            print(f"✅ Final Bot Image URL: {img_url}")

            # 🔹 Resolve question text
            resolved_answers = []
            for entry in (bot.answers or []):
                if not isinstance(entry, dict):
                    continue
                qid = entry.get("question_id")
                if not qid:
                    continue
                q_obj = QuestionCard.objects.filter(id=qid).first()
                resolved_answers.append({
                    "question_id": qid,
                    "question": q_obj.question if q_obj else None,
                    "answers": entry.get("answers", []),
                })

            bots_info.append({
                "id": bot.id,
                "name": bot.name,
                "img_url": img_url,
                "answers": resolved_answers,
            })

        print(f"✅ Returning {len(bots_info)} bots for org={org_id}")
        return JsonResponse({"bots": bots_info})

    except Exception as e:
        print(f"🔥 Exception in get_bot_answers: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)

@csrf_exempt
def get_active_meeting(request, org_id, room_name):
    print(f"🟦 [get_active_meeting] Called for org={org_id}, room={room_name}")

    if request.method != "GET":
        print("❌ Invalid request method:", request.method)
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    cache_key = f"active_meeting:{org_id}:{room_name}"
    data = cache.get(cache_key)

    # ✅ Ensure consistent return structure
    if not isinstance(data, dict):
        print(f"⚠️ No valid cache found for key={cache_key}")
        default = {
            "org_id": int(org_id),
            "room_name": str(room_name),
            "active_bot_ids": [],
            "active_video_id": None,
            "active_survey_id": None,
            "last_updated": now().isoformat(),
        }
        cache.set(cache_key, default)
        return JsonResponse({
            "message": "New active meeting cache created",
            "data": default
        })

    print(f"✅ Retrieved cached active meeting for {cache_key}: {data}")
    return JsonResponse({
        "message": "Active meeting retrieved successfully",
        "data": data
    })

@csrf_exempt
@require_POST
def update_video_state(request, org_id, room_name):
    """
    Updates the cached video playback state for a given org_id and room_name.
    Only modifies fields that are explicitly provided in the request body.
    Broadcasts the updated state to all clients in the same WebSocket group.
    """
    print(f"🟦 [update_video_state] Called for org={org_id}, room={room_name}")

    try:
        body = json.loads(request.body.decode("utf-8"))
        cache_key = f"video_state:{org_id}:{room_name}"

        # Fetch the existing cache or initialize a new one
        existing_state = cache.get(cache_key)
        if not isinstance(existing_state, dict):
            existing_state = {
                "stopped": True,
                "current_time": 0.0,
                "last_updated": now().isoformat(),
            }
            print(f"⚠️ No existing video state, initializing new one for {cache_key}")

        # Only update keys that are explicitly provided
        updated_state = existing_state.copy()
        if "current_time" in body and body["current_time"] is not None:
            updated_state["current_time"] = float(body["current_time"])
        if "stopped" in body and body["stopped"] is not None:
            updated_state["stopped"] = bool(body["stopped"])

        updated_state["last_updated"] = now().isoformat()
        cache.set(cache_key, updated_state, timeout=60 * 60 * 10)

        print(f"✅ Updated video state for {cache_key}: {updated_state}")

        # Broadcast update to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "video_state_update",
                "state": updated_state,
            }
        )

        print(f"📡 Broadcasted video_state_update to {group_name}")
        return JsonResponse({
            "message": "Video state updated successfully",
            "data": updated_state,
        })

    except Exception as e:
        print(f"❌ Error in update_video_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)
    


@csrf_exempt
@require_POST
def reset_video_state(request, org_id, room_name):
    """
    Resets the video playback state for a given org_id and room_name.
    Always sets stopped=True and current_time=0.0, then broadcasts
    the update to all connected WebSocket clients in that group.
    """
    print(f"🔴 [reset_video_state] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"video_state:{org_id}:{room_name}"

        # Define the reset state
        reset_state = {
            "stopped": True,
            "current_time": 0.0,
            "last_updated": now().isoformat(),
        }

        # Save to cache (overwrite existing)
        cache.set(cache_key, reset_state, timeout=60 * 60 * 10)
        print(f"🧹 Reset video state for {cache_key}: {reset_state}")

        # Broadcast to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "video_state_update",
                "state": reset_state,
            }
        )

        print(f"📡 Broadcasted reset video_state_update to {group_name}")
        return JsonResponse({
            "message": "Video state reset successfully",
            "data": reset_state,
        })

    except Exception as e:
        print(f"❌ Error in reset_video_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@require_POST
def pause_video_state(request, org_id, room_name):
    """
    Pauses the video playback for the given org_id and room_name.
    Sets stopped=True but keeps the current time from cache if available.
    Broadcasts the update to all connected WebSocket clients.
    """
    print(f"⏸️ [pause_video_state] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"video_state:{org_id}:{room_name}"

        # Get existing state if available
        existing = cache.get(cache_key)
        if not isinstance(existing, dict):
            existing = {"stopped": True, "current_time": 0.0}
            print(f"⚠️ No existing state found, initializing default for {cache_key}")

        paused_state = {
            **existing,
            "stopped": True,
            "last_updated": now().isoformat(),
        }

        cache.set(cache_key, paused_state, timeout=60 * 60 * 10)
        print(f"💾 Cached paused state for {cache_key}: {paused_state}")

        # Broadcast to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "video_state_update", "state": paused_state}
        )

        print(f"📡 Broadcasted pause_video_state to {group_name}")
        return JsonResponse({"message": "Video paused successfully", "data": paused_state})

    except Exception as e:
        print(f"❌ Error in pause_video_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_POST
def stop_meeting_complete(request, org_id, room_name):
    """
    Marks the meeting as ended for the given org_id and room_name.
    Sets ended=True and retains the current active_survey_id if available.
    Broadcasts the updated meeting state to all connected WebSocket clients.
    """
    print(f"🟥 [stop_meeting_complete] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"

        # Fetch existing meeting state or initialize default
        existing = cache.get(cache_key)
        if not isinstance(existing, dict):
            existing = {
                "org_id": int(org_id),
                "room_name": str(room_name),
                "active_bot_ids": [],
                "active_video_id": None,
                "active_survey_id": None,
                "last_updated": now().isoformat(),
            }
            print(f"⚠️ No existing meeting found, initializing default for {cache_key}")

        # Mark meeting as ended
        updated_state = {
            **existing,
            "ended": True,
            "last_updated": now().isoformat(),
        }

        cache.set(cache_key, updated_state, timeout=60 * 60 * 10)
        print(f"💾 Cached ended meeting state for {cache_key}: {updated_state}")

        # Broadcast to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "meeting_state_changed", "state": updated_state}
        )

        print(f"📡 Broadcasted stop_meeting_complete to {group_name}")
        return JsonResponse({
            "message": "Meeting ended successfully",
            "data": updated_state,
        })

    except Exception as e:
        print(f"❌ Error in stop_meeting_complete: {e}")
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@require_POST
def start_meeting_again(request, org_id, room_name):
    """
    Marks the meeting as started (not ended) for the given org_id and room_name.
    Sets ended=False and retains any existing active_survey_id, bots, or video.
    Broadcasts the updated meeting state to all connected WebSocket clients.
    """
    print(f"🟩 [start_meeting] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"

        # Fetch existing meeting state or initialize default
        existing = cache.get(cache_key)
        if not isinstance(existing, dict):
            existing = {
                "org_id": int(org_id),
                "room_name": str(room_name),
                "active_bot_ids": [],
                "active_video_id": None,
                "active_survey_id": None,
                "last_updated": now().isoformat(),
            }
            print(f"⚠️ No existing meeting found, initializing default for {cache_key}")

        # Mark meeting as active (not ended)
        updated_state = {
            **existing,
            "ended": False,
            "last_updated": now().isoformat(),
        }

        cache.set(cache_key, updated_state, timeout=60 * 60 * 10)
        print(f"💾 Cached active meeting state for {cache_key}: {updated_state}")

        # Broadcast to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "meeting_state_changed", "state": updated_state}
        )

        print(f"📡 Broadcasted start_meeting to {group_name}")
        return JsonResponse({
            "message": "Meeting started successfully",
            "data": updated_state,
        })

    except Exception as e:
        print(f"❌ Error in start_meeting: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def get_meeting_end_state(request, org_id, room_name):
    """
    Returns whether the meeting is currently ended or active.
    Useful for frontend initialization before WebSocket updates arrive.
    """
    print(f"🟢 [get_meeting_state] Request for org={org_id}, room={room_name}")

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"
        existing = cache.get(cache_key)

        if not isinstance(existing, dict):
            print(f"⚠️ No meeting state found for {cache_key}, returning default ended=True")
            return JsonResponse({"ended": True, "exists": False})

        ended = existing.get("ended", True)
        print(f"📦 Cached meeting state for {cache_key}: ended={ended}")
        return JsonResponse({"ended": ended, "exists": True})

    except Exception as e:
        print(f"❌ Error in get_meeting_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
def get_active_survey_id(request, org_id, room_name):
    """
    Returns the current active_survey_id for the given org_id and room_name.
    Looks up the cache key 'active_meeting:{org_id}:{room_name}'.
    If not found, returns active_survey_id=None.
    """
    print(f"🟨 [get_active_survey_id] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"
        state = cache.get(cache_key)

        if not isinstance(state, dict):
            print(f"⚠️ No existing meeting found for {cache_key}")
            return JsonResponse({
                "message": "No active meeting found",
                "active_survey_id": None,
            })

        active_survey_id = state.get("active_survey_id", None)
        print(f"✅ Active survey ID for {cache_key}: {active_survey_id}")

        return JsonResponse({
            "message": "Active survey ID retrieved successfully",
            "active_survey_id": active_survey_id,
        })

    except Exception as e:
        print(f"❌ Error in get_active_survey_id: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_POST
def update_final_state(request, org_id, room_name):
    """
    Updates the active_survey_id for a given org_id and room_name.
    Broadcasts the updated meeting state to all connected WebSocket clients.
    """
    print(f"🟦 [update_final_state] Called for org={org_id}, room={room_name}")

    try:
        body = json.loads(request.body.decode("utf-8"))
        survey_id = body.get("survey_id")
        if survey_id is None:
            return JsonResponse({"error": "Missing 'survey_id' field"}, status=400)

        cache_key = f"active_meeting:{org_id}:{room_name}"
        existing_state = cache.get(cache_key)
        if not isinstance(existing_state, dict):
            existing_state = {
                "org_id": int(org_id),
                "room_name": str(room_name),
                "active_bot_ids": [],
                "active_video_id": None,
                "active_survey_id": None,
                "last_updated": None,
            }
            print(f"⚠️ No existing meeting found, initializing new one for {cache_key}")

        updated_state = existing_state.copy()
        updated_state["active_survey_id"] = survey_id
        updated_state["last_updated"] = now().isoformat()
        cache.set(cache_key, updated_state, timeout=None)

        print(f"✅ Updated active_survey_id for {cache_key}: {survey_id}")

        # Broadcast update to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "meeting_state_changed",
                "state": updated_state,
            }
        )

        print(f"📡 Broadcasted meeting_state_changed to {group_name}")
        return JsonResponse({
            "message": "Survey ID updated successfully",
            "data": updated_state,
        })

    except Exception as e:
        print(f"❌ Error in update_final_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def get_video_state(request, org_id, room_name):
    """
    Retrieves the current video playback state for a given org_id and room_name.
    Returns:
      - stopped (bool)
      - current_time (float)
      - last_updated (str, ISO 8601)
    If no cache entry exists, initializes a default state.
    """
    print(f"🟦 [get_video_state] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"video_state:{org_id}:{room_name}"
        state = cache.get(cache_key)

        if not isinstance(state, dict):
            print(f"⚠️ No video state found for {cache_key}, initializing new one")
            state = {
                "stopped": True,
                "current_time": 0.0,
                "last_updated": now().isoformat(),
            }
            cache.set(cache_key, state, timeout=60 * 60 * 10)

        print(f"✅ Current video state for {cache_key}: {state}")

        return JsonResponse({
            "message": "Video state retrieved successfully",
            "data": state,
        })

    except Exception as e:
        print(f"❌ Error in get_video_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_POST
def start_video_state(request, org_id, room_name):
    """
    Starts (resumes) the video playback for the given org_id and room_name.
    Sets stopped=False but keeps the current time from cache if available.
    Broadcasts the update to all connected WebSocket clients.
    """
    print(f"▶️ [start_video_state] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"video_state:{org_id}:{room_name}"

        # Get existing state if available
        existing = cache.get(cache_key)
        if not isinstance(existing, dict):
            existing = {"stopped": False, "current_time": 0.0}
            print(f"⚠️ No existing state found, initializing default for {cache_key}")

        started_state = {
            **existing,
            "stopped": False,
            "last_updated": now().isoformat(),
        }

        cache.set(cache_key, started_state, timeout=60 * 60 * 10)
        print(f"💾 Cached started state for {cache_key}: {started_state}")

        # Broadcast to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "video_state_update", "state": started_state}
        )

        print(f"📡 Broadcasted start_video_state to {group_name}")
        return JsonResponse({"message": "Video started successfully", "data": started_state})

    except Exception as e:
        print(f"❌ Error in start_video_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_POST
def pause_video_state(request, org_id, room_name):
    """
    Pauses the video playback for the given org_id and room_name.
    Sets stopped=True but keeps the current time from cache if available.
    Broadcasts the update to all connected WebSocket clients.
    """
    print(f"⏸️ [pause_video_state] Called for org={org_id}, room={room_name}")

    try:
        cache_key = f"video_state:{org_id}:{room_name}"

        # Get existing state if available
        existing = cache.get(cache_key)
        if not isinstance(existing, dict):
            existing = {"stopped": True, "current_time": 0.0}
            print(f"⚠️ No existing state found, initializing default for {cache_key}")

        paused_state = {
            **existing,
            "stopped": True,
            "last_updated": now().isoformat(),
        }

        cache.set(cache_key, paused_state, timeout=60 * 60 * 10)
        print(f"💾 Cached paused state for {cache_key}: {paused_state}")

        # Broadcast to WebSocket group
        channel_layer = get_channel_layer()
        group_name = f"meeting_{org_id}_{room_name}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {"type": "video_state_update", "state": paused_state}
        )

        print(f"📡 Broadcasted pause_video_state to {group_name}")
        return JsonResponse({"message": "Video paused successfully", "data": paused_state})

    except Exception as e:
        print(f"❌ Error in pause_video_state: {e}")
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
def get_active_meeting_with_segments(request, org_id, room_name):
    """
    Fetch the active meeting info for a given org and room.
    Includes:
      - active_video_id
      - active_survey_id
      - active_bot_ids
      - last_updated
      - video_url (from Video.url)
      - all associated video segments (with question card data if any)
    Returns "none found" if no meeting cache exists.
    """
    print(f"🟦 [get_active_meeting_with_segments] Called for org={org_id}, room={room_name}")

    if request.method != "GET":
        print("❌ Invalid request method:", request.method)
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    try:
        cache_key = f"active_meeting:{org_id}:{room_name}"
        meeting_data = cache.get(cache_key)

        if not isinstance(meeting_data, dict):
            print(f"⚠️ No meeting cache found for key={cache_key}")
            return JsonResponse({"message": "none found", "data": None})

        print(f"✅ Found cached meeting: {meeting_data}")

        active_video_id = meeting_data.get("active_video_id")
        active_survey_id = meeting_data.get("active_survey_id")
        active_bot_ids = meeting_data.get("active_bot_ids", [])
        last_updated = meeting_data.get("last_updated")

        video_segments_data = []
        video_url = None

        if active_video_id:
            try:
                # 🎥 Fetch video directly
                video_obj = Video.objects.filter(id=active_video_id).first()
                if video_obj:
                    video_url = video_obj.url  # ✅ directly use url field

                # 🎬 Fetch all segments
                segments = (
                    VideoSegment.objects
                    .filter(video_id=active_video_id)
                    .select_related("question_card")
                    .order_by("source_start")
                )

                for seg in segments:
                    seg_data = {
                        "id": seg.id,
                        "source_start": seg.source_start,
                        "source_end": seg.source_end,
                        "question_card": None,
                    }

                    if seg.question_card:
                        q = seg.question_card
                        print("CORRECT ANSER", q.correct_answers)
                        seg_data["question_card"] = {
                            "id": q.id,
                            "question": q.question,
                            "answers": q.answers,
                            "difficulty": q.difficulty,
                            "type": q.type,
                            "display_type": q.display_type,
                            "show_winner": q.show_winner,
                            "live": q.live,
                            "correct_answers": q.correct_answers,
                        }

                    video_segments_data.append(seg_data)

                print(f"🎬 Retrieved {len(video_segments_data)} segments for video {active_video_id}")

            except Exception as e:
                print(f"⚠️ Failed to fetch video segments or URL for {active_video_id}: {e}")
                video_segments_data = []
                video_url = None
        
        return JsonResponse({
            "message": "Active meeting data retrieved",
            "data": {
                "org_id": int(org_id),
                "room_name": str(room_name),
                "active_video_id": active_video_id,
                "active_survey_id": active_survey_id,
                "active_bot_ids": active_bot_ids,
                "last_updated": last_updated,
                "video_url": video_url,  # ✅ clean direct field
                "video_segments": video_segments_data,
            },
        })

    except Exception as e:
        print(f"🔥 Exception in get_active_meeting_with_segments: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)
