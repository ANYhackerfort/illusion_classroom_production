from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    profile_picture = models.ImageField(upload_to="user_profiles/", blank=True, null=True)


class Organization(models.Model):
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="organizations"
    )
    members = models.ManyToManyField(
        User, related_name="joined_organizations", blank=True
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to="organization_images/", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Meeting(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="meetings"
    )

    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="meetings"
    )

    name = models.CharField(max_length=255)
    image_url = models.CharField(max_length=500)
    description = models.TextField()
    questions_count = models.IntegerField()
    video_length_sec = models.IntegerField()
    tags = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    shared_with = models.JSONField(default=list)
    currently_playing = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

class Video(models.Model):
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.SET_NULL,  # ❌ prevents cascade delete
        null=True,
        blank=True,
        related_name="videos",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,  # ✅ one org → many videos
        related_name="videos",
    )
    url = models.URLField(max_length=500)
    thumbnail_url = models.URLField(max_length=500, null=True, blank=True)
    name = models.CharField(max_length=255, default="Untitled Video")  # ✅ added
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)  # reused as last edited

    def __str__(self):
        return f"Video ({self.name}) in {self.organization.name}"

class QuestionCard(models.Model):
    user = models.ForeignKey(  # ✅ still cascade on user delete
        User,
        on_delete=models.CASCADE,
        related_name="question_cards",
    )

    # ✅ Keep question and answers
    question = models.TextField()
    answers = models.JSONField()

    # ✅ Difficulty & type
    difficulty = models.CharField(
        max_length=10,
        choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
    )
    type = models.CharField(
        max_length=10,
        choices=[
            ("slider", "Slider"),
            ("short", "Short"),
            ("mc", "Multiple Choice"),
            ("match", "Match"),
            ("rank", "Rank"),
            ("ai", "AI"),
        ],
    )

    display_type = models.CharField(
        max_length=10,
        choices=[("face", "Face"), ("initial", "Initial"), ("anonymous", "Anonymous")],
        null=True,
        blank=True,
    )
    show_winner = models.BooleanField(null=True, blank=True)
    live = models.BooleanField(null=True, blank=True)

    # ✅ Add associations to organization & meeting
    organization = models.ForeignKey(
        "Organization",
        on_delete=models.SET_NULL,   # ⚠️ do NOT cascade — preserve even if org deleted
        null=True,
        blank=True,
        related_name="question_cards",
    )

    meeting = models.ForeignKey(
        "Meeting",
        on_delete=models.SET_NULL,   # ⚠️ do NOT cascade — preserve even if meeting deleted
        null=True,
        blank=True,
        related_name="question_cards",
    )
    
    correct_answers = models.JSONField(
        null=True,
        blank=True,
        help_text="List of correct answers or a single correct value depending on type",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"QuestionCard({self.question[:30]}...)"

class VideoSegment(models.Model):
    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="segments"
    )  # ✅ one video → many segments
    source_start = models.FloatField()
    source_end = models.FloatField()
    question_card = models.ForeignKey(
        "QuestionCard", on_delete=models.SET_NULL, null=True, blank=True
    )

    def __str__(self):
        return f"Segment {self.source_start}-{self.source_end} for {self.video.id}"
    
class Bot(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bots",
    )
    organization = models.ForeignKey(
        "Organization",  # ✅ add this field
        on_delete=models.CASCADE,  # delete bots if org is deleted
        related_name="bots",
        null=True,
        blank=True,
    )
    meeting = models.ForeignKey(
        "Meeting",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bots",
    )

    name = models.CharField(max_length=255)

    memory = models.TextField(null=True, blank=True)
    answers = models.JSONField(null=True, blank=True)

    image = models.ImageField(upload_to="bot_images/", null=True, blank=True)
    video_url = models.URLField(null=True, blank=True)

    def __str__(self):
        org_name = self.organization.name if self.organization else "No Org"
        return f"🤖 Bot {self.name} ({self.identifier}) — {org_name}"

class Participant(models.Model):
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.SET_NULL,  # ❌ prevent cascade delete
        null=True,
        blank=True,
        related_name="participants",
    )
    name = models.CharField(max_length=255)
    email = models.EmailField()
    picture = models.ImageField(upload_to="participant_images/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    answers = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ("meeting", "email")

    def __str__(self):
        return f"{self.name} ({self.email}) — {self.meeting.name if self.meeting else 'No Meeting'}"

class Survey(models.Model):    
    user = models.ForeignKey(  # ✅ link to User
        User,
        on_delete=models.CASCADE,
        related_name="surveys",
    )
    
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.SET_NULL,  # ❌ prevent cascade delete
        null=True,
        blank=True,
        related_name="surveys",
    )

    organization = models.ForeignKey(  # ✅ NEW: link to Organization
        Organization,
        on_delete=models.SET_NULL,   # ⚠️ preserve survey data even if org deleted
        null=True,
        blank=True,
        related_name="surveys",
    )

    items = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        org_name = self.organization.name if self.organization else "No Org"
        meeting_name = self.meeting.name if self.meeting else "No Meeting"
        return f"Survey {self.id} — {org_name} / {meeting_name}"
