from django.http import JsonResponse
from django.urls import path

from .views import (
    google_login_view,
    create_meeting,
    get_meeting_segments,
    upload_meeting_video,
    refresh_meeting_segments,
    get_user_info,
    check_meeting_access,
    store_bot,
    return_bot_answers,
    get_all_bots,
    store_video,
    get_user_videos,
    get_org_videos,
    store_currently_playing,
    update_bot,
    get_bot_names_and_videos,
    get_meeting_owner,
    archive_meeting,
    unarchive_meeting,
    delete_meeting,
    get_user_stats,
    create_organization,
    join_organization,
    delete_organization,
    check_organization_owner,
    get_organizations,
    delete_bot,
    get_org_meetings,
    delete_video,
    edit_video,
    get_video_by_id,
    get_meeting_id,
    create_question_card,
    get_all_question_cards,
    delete_question_card,
    get_question_card_by_id,
    create_survey,
    get_all_surveys,
    delete_survey,
    get_survey_by_id,
    edit_bot,
    get_bot_by_id,
    update_or_create_active_meeting,
    get_active_meeting,
    reset_video_state,
    pause_video_state,
    start_video_state,
    get_active_meeting_with_segments,
    get_video_state,
    update_video_state,
    join_room,
    generate_answers_bot,
    get_active_bots_video_name,
    stop_meeting_complete,
    update_final_state,
    get_active_survey_id,
    start_meeting_again,
    get_meeting_end_state,
    store_quatric_survey_answers,
    get_all_quatric_survey_answers,
    store_video_question_answers,
    get_all_video_question_answers,
    get_bot_answers,
    get_question_by_id,
)

urlpatterns = [
    path('google-login/', google_login_view),
    
    path("get_meeting_id/<int:org_id>/<str:room_name>/", get_meeting_id, name="get_meeting_id"),
    path("join-room/<int:org_id>/<str:meeting_name>/", join_room, name="join-room"),

      # --- Organization routes ---
    path("organization/create/", create_organization, name="create_organization"),
    path("organization/<int:org_id>/join/", join_organization, name="join_organization"),
    path("organization/<int:org_id>/delete/", delete_organization, name="delete_organization"),
    path("organization/<int:org_id>/check-owner/", check_organization_owner, name="check_organization_owner"),
    path("organizations/", get_organizations, name="get_organizations"),
    path("get_org_meetings/<int:org_id>/", get_org_meetings, name="get_org_meetings"),

    path('create_meeting/<int:org_id>/', create_meeting, name='create-meeting'),
    path('archive_meeting/<int:org_id>/<str:meeting_name>/', archive_meeting, name='archieve_meeting'),
    path('unarchive_meeting/<int:org_id>/<str:meeting_name>/', unarchive_meeting, name='unarchieve_meeting'),
    path('delete_meeting/<int:org_id>/<str:meeting_name>/', delete_meeting, name='delete_meeting'),
    
    path('userinfo/', get_user_info, name="get_user_info"),
    path('get_user_stats/', get_user_stats, name="get_user_stats"),
    
    path('get_meeting_segments/<str:meeting_name>/', get_meeting_segments, name='get_meeting_segments'),
    path('upload_meeting_video/<str:meeting_name>/', upload_meeting_video, name='upload_meeting_video'),
    path('upload_meeting_segments/<str:meeting_name>/', refresh_meeting_segments, name='upload_meeting_segments'),
    
    path("get_bot_answers/<str:meeting_name>/", return_bot_answers, name="return_bot_answers"),  # ✅ Add this
    # path("get_all_bots/<str:meeting_name>/", get_all_bots, name="get_all_bots"),  # ✅ ADD THIS
    
    path("store_video/<int:org_id>/<str:meeting_name>/", store_video, name="store_video"),
    path("get_user_videos/<int:org_id>/<str:meeting_name>/", get_user_videos, name="get_user_videos"),
    path("get_org_videos/<int:org_id>/", get_org_videos, name="get_org_videos"),
    path("delete_video/<int:video_id>/", delete_video, name="delete_video"),
    path("edit_video/<int:video_id>/<int:org_id>/<str:room_name>/", edit_video, name="edit_video"),
    path("get_video_by_id/<int:video_id>/", get_video_by_id, name="get_video_by_id"),
    path("store_video_question_answers/<int:org_id>/<str:room_name>/<int:question_id>/", store_video_question_answers, name="store_video_question_answers"),

    path("store_currently_playing/<str:meeting_name>/", store_currently_playing, name="store_currently_playing"),

    path("update_bot/<str:meeting_name>/", update_bot, name="update_bot"),
    path("get_bot_names_and_videos/<str:meeting_name>/", get_bot_names_and_videos),
    
    path("get_meeting_owner/<int:org_id>/<str:meeting_name>/", get_meeting_owner, name="get_meeting_owner"),
    path("check_access/<int:org_id>/<str:meeting_id>/", check_meeting_access, name="check_meeting_access"),

    # path("save_survey/<str:meeting_name>/", save_survey, name="save_survey"),
    # path("get_survey/<str:meeting_name>/<uuid:survey_id>/", get_survey, name="get_survey"),
    
    path("create_question_card/<int:org_id>/<int:meeting_id>/", create_question_card, name="create_question_card",),
    path("get_all_question_cards/<int:org_id>/", get_all_question_cards, name="get_all_question_cards"),
    path("delete_question_card/<int:question_id>/", delete_question_card, name="delete_question_card",),
    path("get_question_card_by_id/<int:question_id>/", get_question_card_by_id, name="get_question_card_by_id"),
        
    path("create_survey/<int:org_id>/<int:meeting_id>/", create_survey, name="create_survey"),
    path("get_all_surveys/<int:org_id>/", get_all_surveys, name="get_all_surveys"),
    path("delete_survey/<int:survey_id>/", delete_survey, name="delete_survey"),
    path("get_survey_by_id/<int:survey_id>/", get_survey_by_id, name="get_survey_by_id"),
    
    # path("store_bot/<str:meeting_name>/", store_bot, name="store_bot"),
    # path("delete_bot/<uuid:bot_id>/", delete_bot, name="delete_bot"),
    
    path("store_bot/<int:org_id>/<str:meeting_name>/", store_bot, name="store_bot"),
    path("edit_bot/<int:bot_id>/<int:org_id>/<str:room_name>/", edit_bot, name="edit_bot"),           # ✅ changed
    path("delete_bot/<int:bot_id>/", delete_bot, name="delete_bot"),     # ✅ changed
    path("get_bot_by_id/<int:bot_id>/", get_bot_by_id, name="get_bot_by_id"),  # ✅ changed
    path("get_all_bots/<int:org_id>/", get_all_bots, name="get_all_bots"),
    path("generate_answers_bot/<int:bot_id>/<int:org_id>/<str:room_name>/", generate_answers_bot, name="generate_answers_bot",),
    path(
        "get_active_bots_video_name/<int:org_id>/<str:room_name>/",
        get_active_bots_video_name,
        name="get_active_bots_video_name",
    ),
    path(
        "get_all_video_question_answers/<int:org_id>/<str:room_name>/",
        get_all_video_question_answers,
        name="get_all_video_question_answers",
    ),
    path(
        "get_bot_answers/<int:org_id>/<str:room_name>/",
        get_bot_answers,
        name="get_bot_answers",
    ),
    path("get_question_by_id/<int:question_id>/",
         get_question_by_id,
         name="get_question_by_id",
        ),
    
    path("update_final_state/<int:org_id>/<str:room_name>/", update_final_state, name="edit_bot"),
    path("stop_meeting_complete/<int:org_id>/<str:room_name>/", stop_meeting_complete, name="edit_bot"),
    path("get_active_survey_id/<int:org_id>/<str:room_name>/", get_active_survey_id, name="get_active_survey_by_id"),
    path("start_meeting_again/<int:org_id>/<str:room_name>/", start_meeting_again, name="start_meeting"),
    path("get_meeting_state/<int:org_id>/<str:room_name>/", get_meeting_end_state, name="get_meeting_state"),
    path("store_quatric_survey_answers/<int:org_id>/<str:room_name>/", store_quatric_survey_answers, name="store_quatric_survey_answers"),

    path("get_all_quatric_survey_answers/<int:org_id>/<str:room_name>/", get_all_quatric_survey_answers, name="get_all_quatric_survey_answers"),
    path("update_active_meeting/<int:org_id>/<str:room_name>/", update_or_create_active_meeting, name="update_active_meeting"),
    path("get_active_meeting/<int:org_id>/<str:room_name>/", get_active_meeting, name="get_active_meeting"),
    path("pause_video_state/<int:org_id>/<str:room_name>/", pause_video_state, name="pause_video_state"),
    path("start_video_state/<int:org_id>/<str:room_name>/", start_video_state, name="start_video_state"),
    path("reset_video_state/<int:org_id>/<str:room_name>/", reset_video_state, name="reset_video_state"),
    path("update_video_state/<int:org_id>/<str:room_name>/", update_video_state, name="update_video_state"),
    path("get_video_state/<int:org_id>/<str:room_name>/", get_video_state, name="get_video_state",),
    path("get_active_meeting_with_segments/<int:org_id>/<str:room_name>/", get_active_meeting_with_segments, name="get_active_meeting_with_segments",),
    path("health/", lambda r: JsonResponse({"ok": True})),

]
