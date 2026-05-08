import { Context, SessionFlavor } from "grammy";
import { Category, DurationTag } from "#root/types/enums.js";

export type Scene =
    | "onboarding:timezone"
    | "onboarding:brief_time"
    | "onboarding:quiet_hours_from"
    | "onboarding:quiet_hours_to"
    | "capture:awaiting_title"
    | "capture:edit_title"
    | "capture:awaiting_category"
    | "capture:awaiting_duration"
    | "capture:awaiting_options"
    | "capture:awaiting_date"
    | "capture:awaiting_time"
    | "capture:awaiting_delegate"
    | "notif:reschedule"
    | "notif:reschedule_custom"
    | "brief:awaiting_custom_hours"
    | "brief:selecting_candidates"
    | null;

export interface OnboardingDraft {
    timezone?: string;
    brief_time?: string;
    quiet_hours_from?: string | null;
    quiet_hours_to?: string | null;
    isEditing?: boolean;
}

export interface CaptureDraft {
    taskId?: string;
    title?: string;
    category?: Category;
    duration_tag?: DurationTag;
    due_date?: string;
    due_time?: string;
    delegated_to?: string;
    attachment_file_id?: string;
    attachment_type?: string;
}

export interface MorningBriefDraft {
    freeMinutes?: number;
    mandatoryMinutes?: number;
    plannedTaskIds?: string[];
    candidateIds?: string[];
    currentCandidateIndex?: number;
}

export interface SessionData {
    scene: Scene;
    sceneHistory: Scene[];
    onboarding?: OnboardingDraft;
    capture?: CaptureDraft;
    captureStartedAt?: number;
    rescheduleTaskId?: string;
    brief?: MorningBriefDraft;
    briefStartedAt?: number;
    eloSession?: {
        taskIds: string[];
        pairs: Array<[string, string]>;
        round: number;
        totalRounds: number;
    };
}

export type BotContext = Context & SessionFlavor<SessionData>;
