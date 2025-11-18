import React, { useState, useEffect, useRef } from "react";
import "./SurveyDropZone.css";
import SurveyBlock from "./SurveyBlock";
import { Survey } from "../../indexDB/surveyStorage";
import type { SurveyItem } from "../../indexDB/surveyStorage";
import {
  saveSurvey,
  getAllSurveys,
  deleteSurveyById,
  clearAllSurveys,
} from "../../indexDB/surveyStorage";
import { useOrgSocketContext } from "../../finder/socket/OrgSocketContext";
import { useParams } from "react-router-dom";
import {
  getMeetingId,
  getAllSurveysFromBackend,
  saveSurveyToBackend,
  getSurveyById,
} from "../../components/videoDisplayer/api/save";

interface SurveyDropZoneProps {
  tabIndex?: number;
  userChecked?: boolean;
  orgChecked?: boolean;
  selectedIndex: number;
}

const SurveyDropZone: React.FC<SurveyDropZoneProps> = ({
  tabIndex,
  userChecked = false,
  orgChecked = false,
  selectedIndex,
}) => {
  const [displaySurveys, setDisplaySurveys] = useState<Survey[]>([]);
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();
  const { socket } = useOrgSocketContext();
  const currentMeetingIdRef = useRef<string | null>(null);
  // const { setDraggedItem } = useMouse();

  // ===============================
  // 🧠 1. Sync surveys from backend
  // ===============================
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        if (!org_id) {
          console.warn(
            "⚠️ Missing org_id in route params — cannot sync surveys.",
          );
          return;
        }

        console.log(
          "%c🚀 Syncing Surveys from backend (fresh start)...",
          "color: #00aaff",
        );

        // ✅ 1. Clear existing data
        await clearAllSurveys();
        console.log(
          "%c🧹 Cleared old Surveys from IndexedDB.",
          "color: orange;",
        );

        // ✅ 2. Fetch new surveys
        const backendSurveys = await getAllSurveysFromBackend(Number(org_id));
        console.log(
          `✅ Retrieved ${backendSurveys.length} surveys from backend.`,
        );

        // ✅ 3. Save all to IndexedDB in parallel
        await Promise.all(
          backendSurveys.map(async (s) => {
            const survey = new Survey(
              String(s.id),
              s.items ?? [],
              s.associated_meeting_id,
            );
            await saveSurvey(survey);
          }),
        );

        console.log(
          "%c💾 All surveys written to IndexedDB.",
          "color: #33cc33;",
        );

        // ✅ 4. Now reload for UI display
        await loadFromIndexedDB();
        console.log(
          "%c✅ Surveys loaded into display state.",
          "color: #00cc88; font-weight: bold;",
        );
      } catch (err) {
        console.error("❌ Failed to sync surveys from backend:", err);
      }
    };

    syncFromBackend();
  }, [selectedIndex]);

  // ===============================
  // 🧠 2. Load meeting ID (once)
  // ===============================
  useEffect(() => {
    const fetchMeetingId = async () => {
      if (!org_id || !roomName) return;
      const id = await getMeetingId(Number(org_id), roomName);
      if (id) currentMeetingIdRef.current = String(id);
    };
    fetchMeetingId();
  }, [org_id, roomName]);

  // ===============================
  // 🧠 3. Load & filter from IndexedDB (user/org)
  // ===============================
  const loadFromIndexedDB = async () => {
    console.log(
      `%c💾 [SurveyDropZone] Loading surveys — userChecked=${userChecked}, orgChecked=${orgChecked}`,
      "color: #00aaff; font-weight: bold;",
    );

    if (!userChecked && !orgChecked) {
      console.log("%c🚫 No filters selected. Clearing list.", "color: gray;");
      setDisplaySurveys([]);
      return;
    }

    try {
      console.log(
        "%c📂 Fetching all surveys from IndexedDB...",
        "color: #33cc33;",
      );
      const localSurveys = await getAllSurveys();
      console.log(
        `%c📥 Retrieved ${localSurveys.length} surveys`,
        "color: #33cc33;",
      );

      let filtered = localSurveys;

      // User-specific (current meeting only)
      if (userChecked && !orgChecked && currentMeetingIdRef.current) {
        filtered = localSurveys.filter(
          (s: any) => s.associated_meeting_id === currentMeetingIdRef.current,
        );
        console.log(
          `%c👤 Showing ${filtered.length} surveys for current meeting (${currentMeetingIdRef.current})`,
          "color: #66ccff;",
        );
      }
      // Org-wide (exclude current meeting)
      else if (orgChecked && !userChecked) {
        filtered = localSurveys.filter(
          (s: any) => s.associated_meeting_id !== currentMeetingIdRef.current,
        );
        console.log(
          `%c🏢 Showing ${filtered.length} org-wide surveys (not in current meeting)`,
          "color: #ffcc33;",
        );
      }

      setDisplaySurveys(filtered);
      console.log(
        "%c✅ Surveys ready for display (IndexedDB).",
        "color: #00cc88;",
      );
    } catch (err) {
      console.error(
        "%c❌ Failed to fetch surveys from IndexedDB:",
        "color: red;",
        err,
      );
      setDisplaySurveys([]);
    }
  };

  useEffect(() => {
    loadFromIndexedDB();
  }, [userChecked, orgChecked]);

  // ===============================
  // 🧠 4. Listen for WebSocket updates
  // ===============================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "org_update" || msg.category !== "survey") return;

      const { action, payload } = msg;
      const surveyId = String(payload?.id || "");

      if (!surveyId) {
        console.warn(
          "⚠️ [SurveyDropZone] Received org_update with no survey ID:",
          msg,
        );
        return;
      }

      console.log(
        `📢 [SurveyDropZone] Org update (${action}) received for survey ${surveyId}`,
      );

      try {
        switch (action) {
          case "delete":
            console.log(`🗑️ Removing survey ${surveyId} from IndexedDB...`);
            await deleteSurveyById(surveyId);
            setDisplaySurveys((prev) => prev.filter((s) => s.id !== surveyId));
            break;

          case "create": {
            console.log(
              `🆕 Fetching newly created Survey ${surveyId} from backend...`,
            );

            const s = await getSurveyById(surveyId);
            console.log("GOTTEN SURVEY IS", s);
            if (!s) {
              console.warn(`⚠️ No Survey found for ID ${surveyId}`);
              break;
            }

            // Determine current and associated meeting
            const currentMeetingId = currentMeetingIdRef.current;
            const associatedMeetingId = s.associated_meeting_id ?? null;
            const isCurrentMeeting =
              String(associatedMeetingId) === String(currentMeetingId);

            // Skip if not for the current meeting (mirror QuestionDropZone logic)
            if (
              (!userChecked && orgChecked && isCurrentMeeting) ||
              (userChecked && !orgChecked && !isCurrentMeeting) ||
              (!userChecked && !orgChecked) // both filters off
            ) {
              console.log(
                `🚫 Skipping Survey ${surveyId} — ` +
                  `userChecked=${userChecked}, orgChecked=${orgChecked}`,
              );
              break;
            }

            // ✅ Save to IndexedDB
            await saveSurvey(s);

            // ✅ Add to state (same pattern as questions)
            setDisplaySurveys((prev) => [...prev, s]);

            console.log(`✅ Saved and displayed new Survey ${s.id}.`);
            break;
          }

          default:
            console.warn(`⚠️ [SurveyDropZone] Unknown action '${action}'`);
        }
      } catch (err) {
        console.error(
          `❌ [SurveyDropZone] Error handling org_update (${action}):`,
          err,
        );
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, userChecked, orgChecked]);

  // ===============================
  // 📥 5. Handle survey file drop
  // ===============================
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== "text/plain") return;

    if (!org_id || !roomName) {
      console.warn("⚠️ Missing org_id or roomName in route params.");
      return;
    }

    const meetingId = await getMeetingId(Number(org_id), roomName);
    if (!meetingId) {
      console.warn("⚠️ Could not resolve meeting_id for", { org_id, roomName });
      return;
    }

    currentMeetingIdRef.current = String(meetingId);

    const text = await file.text();
    const blocks = text.split(/\n\s*\n/);
    const newItems: SurveyItem[] = [];
    const safeTabIndex = tabIndex ?? 1;

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lines.length) continue;

      if (lines[0].startsWith("Description:")) {
        newItems.push({
          id: crypto.randomUUID(),
          type: "description",
          content: lines.slice(1).join(" "),
          associatedTab: safeTabIndex,
        });
      } else if (lines[0].startsWith("Q:")) {
        const typeLine = lines.find((l) => l.startsWith("T:"));
        const type = (
          typeLine ? typeLine.replace(/^T:\s*/, "").toLowerCase() : "mcq"
        ) as "slider" | "mcq";

        const question = lines[0].replace(/^Q:\s*/, "");
        const options = lines
          .filter((l) => l.startsWith("A:"))
          .map((a) => a.replace(/^A:\s*/, ""));

        if (type === "slider") {
          newItems.push({
            id: crypto.randomUUID(),
            type,
            question,
            min: 0,
            max: 10,
            associatedTab: safeTabIndex,
          });
        } else {
          newItems.push({
            id: crypto.randomUUID(),
            type,
            question,
            options,
            associatedTab: safeTabIndex,
          });
        }
      } else if (lines[0].startsWith("Qualtrics:")) {
        newItems.push({
          id: crypto.randomUUID(),
          type: "qualtrics",
          url: lines[0].replace(/^Qualtrics:\s*/, ""),
          associatedTab: safeTabIndex,
        });
      }
    }

    if (newItems.length === 0) {
      console.warn("⚠️ No valid survey items parsed from file.");
      return;
    }

    try {
      // ✅ 1) Create draft survey (with meeting id included)
      const draft = new Survey("temp", newItems, meetingId);

      // ✅ 2) Send to backend
      const res = await saveSurveyToBackend(
        Number(org_id),
        Number(meetingId),
        draft,
      );
      console.log("🧠 THE RESULT IS:", res);

      // ✅ 3) Create a real survey with backend-assigned ID and meeting association
      const saved = new Survey(String(res.survey_id), newItems, meetingId);
      // ✅ 4) Save to IndexedDB
      await saveSurvey(saved);

      console.log("✅ Survey created (backend + local):", saved);
    } catch (err) {
      console.error("❌ Failed to save survey to backend:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  // ===============================
  // 🧱 Render surveys
  // ===============================
  return (
    <div
      className="surveyzone-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {displaySurveys.length === 0 ? (
        <div className="surveyzone-instructions">
          <div className="surveyzone-instruction-box">
            <strong>Example Format:</strong>
            <pre>
              {`Description:
  This survey collects course feedback.

  Q: How satisfied are you with the class?
  T: slider

  Q: Which of these tools did you use?
  T: mcq
  A: Python
  A: R
  A: MATLAB

  Qualtrics: https://example.qualtrics.com`}
            </pre>
            <ul>
              <li>
                File must be a <code>.txt</code> file
              </li>
              <li>
                Use <code>Description:</code> for text
              </li>
              <li>
                Use <code>Q:</code> + <code>T:</code> for questions
              </li>
              <li>
                Use <code>Qualtrics:</code> for links
              </li>
            </ul>
          </div>
          <div className="surveyzone-no-files">
            No survey loaded yet. Just drag your <code>.txt</code> here!
          </div>
        </div>
      ) : (
        <div className="surveyzone-list">
          {displaySurveys.map((survey) => (
            <SurveyBlock
              key={survey.id}
              survey={survey}
              onDelete={async (id) => {
                await deleteSurveyById(id);
                setDisplaySurveys((prev) => prev.filter((s) => s.id !== id));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyDropZone;
