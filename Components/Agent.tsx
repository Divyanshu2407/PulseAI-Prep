"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GoogleGenAI, Modality } from "@google/genai";
import { Clock3, Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { createFeedback, saveInterviewTranscript } from "@/lib/actions/general.action";
import { GEMINI_LIVE_MODEL } from "@/lib/gemini-live";

enum CallStatus {
    INACTIVE = "INACTIVE",
    CONNECTING = "CONNECTING",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
}

interface SavedMessage {
    role: "user" | "assistant";
    content: string;
}
interface TextAnswer { questionIndex: number; answer: string }
interface TextInterviewState { questions: string[]; durationMinutes: number; index: number; draft: string; answers: TextAnswer[]; skipped: number[] }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionErrorLike { error: string }
interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface AgentProps {
    userName: string;
    userId: string;
    interviewId: string;
    initialTranscript?: SavedMessage[];
    initialSessionProgress?: SessionProgressInput;
}

const Agent = ({ userName, userId, interviewId, initialTranscript = [], initialSessionProgress }: AgentProps) => {
    const router = useRouter();
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>(initialTranscript);
    const [completionReason, setCompletionReason] = useState<InterviewEndReason | null>(null);
    const messagesRef = useRef<SavedMessage[]>(initialTranscript);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [isClosingSession, setIsClosingSession] = useState(false);
    const [questionProgress, setQuestionProgress] = useState({ core: 0, coreTotal: 4, skipped: 0, processed: 0, current: 0, extra: 0, extraCompleted: 0, extraLimit: 2 });
    const [transcriptSaveStatus, setTranscriptSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [micReady, setMicReady] = useState(false);
    const [micStatus, setMicStatus] = useState("");
    const [micLevel, setMicLevel] = useState(0);
    const [captionLarge, setCaptionLarge] = useState(false);
    const [speechRate, setSpeechRate] = useState("1");
    const [textInterview, setTextInterview] = useState<TextInterviewState | null>(null);
    const [isDictating, setIsDictating] = useState(false);
    const [isStoppingDictation, setIsStoppingDictation] = useState(false);
    const [dictationStatus, setDictationStatus] = useState("");
    const [dictationError, setDictationError] = useState("");

    const feedbackGeneratedRef = useRef(false);
    const sessionIdRef = useRef(0);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const liveSessionRef = useRef<Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
    const nextAudioTimeRef = useRef(0);
    const isAiSpeakingRef = useRef(false);
    const userSpeakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const coreQuestionsCompletedRef = useRef(0);
    const coreQuestionsProcessedRef = useRef(0);
    const coreQuestionsSkippedRef = useRef(0);
    const answeredCoreQuestionIndexesRef = useRef<number[]>([]);
    const skippedCoreQuestionIndexesRef = useRef<number[]>([]);
    const coreQuestionCountRef = useRef(4);
    const coreQuestionTextsRef = useRef<string[]>([]);
    const activeCoreQuestionIndexRef = useRef(0);
    const candidateAnsweredCurrentCoreRef = useRef(false);
    const extraQuestionsRequestedRef = useRef(0);
    const extraQuestionsCompletedRef = useRef(0);
    const extraQuestionLimitRef = useRef(2);
    const pendingFinishRef = useRef(false);
    const finishCloseScheduledRef = useRef(false);
    const finishCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timeLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timeLimitRequestedRef = useRef(false);
    const completionReasonRef = useRef<InterviewEndReason | null>(null);
    const micCheckContextRef = useRef<AudioContext | null>(null);
    const micMeterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const textAnswersRef = useRef<TextAnswer[]>([]);
    const textSkippedRef = useRef<number[]>([]);
    const textQuestionsRef = useRef<string[]>([]);
    const textCoreQuestionCountRef = useRef(0);
    const textInterviewActiveRef = useRef(false);
    const textSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const dictationActiveRef = useRef(false);
    const dictationBaseRef = useRef("");
    const dictationFinalRef = useRef("");
    const dictationInterimRef = useRef("");
    const textDraftRef = useRef("");
    const textQuestionIndexRef = useRef(0);
    const speechRateRef = useRef(1);

    const getVoiceErrorMessage = (cause: unknown) => {
        const errorName = cause instanceof DOMException ? cause.name : "";
        if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
            return "Microphone access was blocked. Allow microphone access for this site in your browser settings, then try again.";
        }
        if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
            return "No microphone was found. Connect or enable a microphone, then try again.";
        }
        if (errorName === "NotReadableError" || errorName === "TrackStartError") {
            return "Your microphone could not be opened. Close other apps using it, check the device, and try again.";
        }
        if (cause instanceof Error && /AudioWorklet|execution context/i.test(cause.message)) {
            return "Your browser could not set up live microphone capture. Check microphone access again, or use the text-only interview.";
        }
        if (cause instanceof TypeError && !navigator.onLine) {
            return "You appear to be offline. Reconnect to the internet and try again.";
        }
        return cause instanceof Error
            ? `The voice session could not start: ${cause.message}`
            : "The voice session could not start. Check your microphone and internet connection, then try again.";
    };

    const updateSpeechRate = (value: string) => {
        speechRateRef.current = Number(value) || 1;
        setSpeechRate(value);
    };

    const cancelVoiceTyping = () => {
        const recognition = speechRecognitionRef.current;
        speechRecognitionRef.current = null;
        dictationActiveRef.current = false;
        if (recognition) {
            recognition.onstart = null;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            try { recognition.abort(); } catch { /* The browser may already have closed the recognizer. */ }
        }
        setIsDictating(false);
        setIsStoppingDictation(false);
    };

    const stopVoiceTyping = () => {
        const recognition = speechRecognitionRef.current;
        if (!recognition) return;
        setIsStoppingDictation(true);
        setDictationStatus("Finishing voice input…");
        try { recognition.stop(); } catch {
            cancelVoiceTyping();
            setDictationStatus("Voice input stopped. Review the recognized text before submitting.");
        }
    };

    const startVoiceTyping = () => {
        const recognitionWindow = window as SpeechRecognitionWindow;
        const Recognition = recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;
        if (!Recognition) {
            setDictationError("Voice typing is not available in this browser. Try a supported browser or type your answer instead.");
            setDictationStatus("");
            return;
        }

        cancelVoiceTyping();
        setDictationError("");
        setDictationStatus("Starting voice input…");
        setIsStoppingDictation(false);
        dictationBaseRef.current = textDraftRef.current.trim();
        dictationFinalRef.current = "";
        dictationInterimRef.current = "";

        const recognition = new Recognition();
        recognition.lang = navigator.language || "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => {
            dictationActiveRef.current = true;
            setIsDictating(true);
            setDictationStatus("Listening. Your words will appear in the answer box.");
        };
        recognition.onresult = (event) => {
            const interimParts: string[] = [];
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const transcript = event.results[index]?.[0]?.transcript?.trim();
                if (!transcript) continue;
                if (event.results[index].isFinal) {
                    dictationFinalRef.current = [dictationFinalRef.current, transcript].filter(Boolean).join(" ");
                } else interimParts.push(transcript);
            }
            dictationInterimRef.current = interimParts.join(" ");
            const nextDraft = [dictationBaseRef.current, dictationFinalRef.current, dictationInterimRef.current]
                .filter(Boolean)
                .join(" ")
                .replace(/\s+([.,?!;:])/g, "$1")
                .slice(0, 6000);
            textDraftRef.current = nextDraft;
            setTextInterview((current) => current ? { ...current, draft: nextDraft } : current);
        };
        recognition.onerror = (event) => {
            const messages: Record<string, string> = {
                "not-allowed": "Microphone access was denied. Allow microphone access in your browser settings, then try again.",
                "service-not-allowed": "This browser's speech recognition service is unavailable. You can still type your answer.",
                "audio-capture": "No microphone was found. Connect or enable one, then try again.",
                "no-speech": "No speech was detected. Tap the microphone and try again.",
                network: "The browser speech-recognition service could not connect. Try this page in a browser with speech recognition enabled, or type your answer.",
            };
            dictationActiveRef.current = false;
            setIsDictating(false);
            setIsStoppingDictation(false);
            setDictationStatus("");
            setDictationError(messages[event.error] || "Voice input stopped unexpectedly. Try again or type your answer.");
        };
        recognition.onend = () => {
            if (speechRecognitionRef.current === recognition) speechRecognitionRef.current = null;
            dictationActiveRef.current = false;
            setIsDictating(false);
            setIsStoppingDictation(false);
            setDictationStatus("Voice input stopped. Review the recognized text before submitting.");
        };
        speechRecognitionRef.current = recognition;
        dictationActiveRef.current = true;
        setIsDictating(true);
        try {
            recognition.start();
        } catch {
            cancelVoiceTyping();
            setDictationStatus("");
            setDictationError("Could not start voice input. Check microphone permissions and try again.");
        }
    };

    useEffect(() => () => {
        // Ignore callbacks from any Live connection that resolves after this page unmounts.
        sessionIdRef.current += 1;
        if (finishCloseTimerRef.current) clearTimeout(finishCloseTimerRef.current);
        if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
        if (textSessionTimerRef.current) clearTimeout(textSessionTimerRef.current);
        if (micMeterTimerRef.current) clearInterval(micMeterTimerRef.current);
        const recognition = speechRecognitionRef.current;
        if (recognition) {
            recognition.onstart = null;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            try { recognition.abort(); } catch { /* The browser may already have closed the recognizer. */ }
        }
        if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
        void micCheckContextRef.current?.close();
        if (userSpeakingTimerRef.current) clearTimeout(userSpeakingTimerRef.current);
        processorRef.current?.disconnect();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        liveSessionRef.current?.close();
        void audioContextRef.current?.close();
    }, []);

    const checkMicrophone = async () => {
        setMicStatus("");
        if (!navigator.onLine) { setMicStatus("You appear to be offline. Reconnect before starting the voice session."); return; }
        try {
            if (!streamRef.current?.active) {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
            }
            const context = new AudioContext();
            micCheckContextRef.current = context;
            await context.resume();
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            context.createMediaStreamSource(streamRef.current).connect(analyser);
            const samples = new Uint8Array(analyser.frequencyBinCount);
            if (micMeterTimerRef.current) clearInterval(micMeterTimerRef.current);
            micMeterTimerRef.current = setInterval(() => {
                analyser.getByteTimeDomainData(samples);
                const volume = samples.reduce((sum, sample) => sum + Math.abs(sample - 128), 0) / samples.length;
                setMicLevel(Math.min(100, Math.round(volume * 2.6)));
            }, 120);
            setMicReady(true);
            setMicStatus("Microphone is ready. Speak to check the level, then start when you’re ready.");
        } catch (cause) {
            setMicReady(false);
            setMicStatus(getVoiceErrorMessage(cause));
        }
    };

    const startTextInterview = async () => {
        setError(null);
        setMicStatus("Preparing accessible text interview…");
        try {
            const response = await fetch("/api/gemini/session-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interviewId, textOnly: true }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not prepare the text interview.");
            const questions = Array.isArray(data.questions) ? data.questions.filter((question: unknown): question is string => typeof question === "string") : [];
            if (!questions.length) throw new Error("No prepared questions are available for this interview.");
            textAnswersRef.current = [];
            textSkippedRef.current = [];
            textQuestionsRef.current = questions;
            textCoreQuestionCountRef.current = questions.length;
            textDraftRef.current = "";
            textQuestionIndexRef.current = 0;
            textInterviewActiveRef.current = true;
            const durationMinutes = data.durationMinutes || 10;
            setTextInterview({ questions, durationMinutes, index: 0, draft: "", answers: [], skipped: [] });
            setDictationError("");
            setDictationStatus("");
            if (textSessionTimerRef.current) clearTimeout(textSessionTimerRef.current);
            textSessionTimerRef.current = setTimeout(() => {
                const currentDraft = textDraftRef.current.trim();
                const timedOutAnswers = currentDraft
                    ? [...textAnswersRef.current.filter((answer) => answer.questionIndex !== textQuestionIndexRef.current), { questionIndex: textQuestionIndexRef.current, answer: currentDraft }]
                    : textAnswersRef.current;
                finishTextInterview(timedOutAnswers, textSkippedRef.current, "time_limit");
            }, durationMinutes * 60 * 1000);
            setMicStatus("");
        } catch (cause) { setMicStatus(cause instanceof Error ? cause.message : "Could not prepare the text interview."); }
    };

    const finishTextInterview = (answers: TextAnswer[], skipped: number[], reason: InterviewEndReason) => {
        cancelVoiceTyping();
        setDictationStatus("");
        if (!answers.length) { setError("Write at least one answer before submitting for feedback."); return; }
        textDraftRef.current = "";
        textInterviewActiveRef.current = false;
        const questions = textQuestionsRef.current;
        const coreQuestionCount = textCoreQuestionCountRef.current || questions.length;
        const coreAnswers = answers.filter((item) => item.questionIndex < coreQuestionCount);
        const coreSkipped = skipped.filter((index) => index < coreQuestionCount);
        const extraAnswers = answers.filter((item) => item.questionIndex >= coreQuestionCount);
        coreQuestionCountRef.current = coreQuestionCount;
        coreQuestionsCompletedRef.current = coreAnswers.length;
        coreQuestionsSkippedRef.current = coreSkipped.length;
        coreQuestionsProcessedRef.current = coreAnswers.length + coreSkipped.length;
        answeredCoreQuestionIndexesRef.current = coreAnswers.map((item) => item.questionIndex + 1);
        skippedCoreQuestionIndexesRef.current = coreSkipped.map((index) => index + 1);
        extraQuestionsRequestedRef.current = 0;
        extraQuestionsCompletedRef.current = extraAnswers.length;
        completionReasonRef.current = reason;
        setCompletionReason(reason);
        if (textSessionTimerRef.current) clearTimeout(textSessionTimerRef.current);
        const transcript: SavedMessage[] = [];
        questions.forEach((question, index) => {
            const answer = answers.find((item) => item.questionIndex === index)?.answer;
            if (answer) transcript.push({ role: "assistant", content: question }, { role: "user", content: answer });
            else if (skipped.includes(index)) transcript.push({ role: "assistant", content: question });
        });
        messagesRef.current = transcript;
        setMessages(transcript);
        setCallStatus(CallStatus.FINISHED);
        setTextInterview(null);
    };

    const submitTextAnswer = () => {
        if (!textInterview) return;
        setDictationError("");
        if (dictationActiveRef.current) {
            setDictationError("Stop voice input and review the recognized text before continuing.");
            return;
        }
        const answer = (textDraftRef.current || textInterview.draft).trim();
        if (answer.length < 2) { setError("Add a short answer before moving to the next question, or skip it."); return; }
        const answers = [...textInterview.answers, { questionIndex: textInterview.index, answer }];
        textAnswersRef.current = answers;
        textDraftRef.current = "";
        setError(null);
        if (textInterview.index + 1 >= textInterview.questions.length) {
            finishTextInterview(answers, textInterview.skipped, "planned_complete");
        } else {
            textQuestionIndexRef.current = textInterview.index + 1;
            setDictationError("");
            setDictationStatus("");
            setTextInterview({ ...textInterview, answers, index: textInterview.index + 1, draft: "" });
        }
    };

    const skipTextQuestion = () => {
        if (!textInterview) return;
        setDictationError("");
        if (dictationActiveRef.current) {
            setDictationError("Stop voice input before skipping this question.");
            return;
        }
        if (textInterview.index + 1 >= textInterview.questions.length && textInterview.answers.length === 0) {
            setError("Answer at least one question before finishing for feedback.");
            return;
        }
        const skipped = [...textInterview.skipped, textInterview.index];
        textSkippedRef.current = skipped;
        textDraftRef.current = "";
        if (textInterview.index + 1 >= textInterview.questions.length) finishTextInterview(textInterview.answers, skipped, "planned_complete");
        else {
            textQuestionIndexRef.current = textInterview.index + 1;
            setDictationError("");
            setDictationStatus("");
            setTextInterview({ ...textInterview, skipped, index: textInterview.index + 1, draft: "" });
        }
    };

    const finishTextEarly = () => {
        if (!textInterview) return;
        setDictationError("");
        if (dictationActiveRef.current) {
            setDictationError("Stop voice input and review the recognized text before finishing.");
            return;
        }
        const draft = (textDraftRef.current || textInterview.draft).trim();
        const answers = draft.length >= 2
            ? [...textInterview.answers.filter((answer) => answer.questionIndex !== textInterview.index), { questionIndex: textInterview.index, answer: draft }]
            : textInterview.answers;
        finishTextInterview(answers, textInterview.skipped, "candidate_requested");
    };

    useEffect(() => {
        if (callStatus !== CallStatus.ACTIVE || messages.length === 0) return;
        let cancelled = false;
        const timeout = setTimeout(async () => {
            setTranscriptSaveStatus("saving");
            try {
                const result = await saveInterviewTranscript(interviewId, messages, {
                    reason: "connection_lost",
                    completedCoreQuestions: coreQuestionsCompletedRef.current,
                    totalCoreQuestions: coreQuestionCountRef.current,
                    skippedCoreQuestions: coreQuestionsSkippedRef.current,
                    completedExtraQuestions: extraQuestionsCompletedRef.current,
                    queuedExtraQuestions: extraQuestionsRequestedRef.current,
                    answeredCoreQuestionIndexes: [...answeredCoreQuestionIndexesRef.current],
                    skippedCoreQuestionIndexes: [...skippedCoreQuestionIndexesRef.current],
                });
                if (!result.success) throw new Error(result.error || "Transcript autosave failed.");
                if (!cancelled) {
                    setTranscriptSaveStatus("saved");
                    setError((current) => current?.startsWith("The latest transcript turn could not be autosaved.") ? null : current);
                }
            } catch (cause) {
                console.error("Transcript autosave failed:", cause);
                if (!cancelled) {
                    setTranscriptSaveStatus("error");
                    setError("The latest transcript turn could not be autosaved. Keep this page open; you can retry saving or finish the interview to save it again.");
                }
            }
        }, 1500);
        return () => { cancelled = true; clearTimeout(timeout); };
    }, [callStatus, interviewId, messages]);

    useEffect(() => {
        const container = transcriptContainerRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const playPcmAudio = async (base64: string, context: AudioContext) => {
        const binary = atob(base64);
        const samples = new Int16Array(binary.length / 2);
        for (let i = 0; i < samples.length; i++) {
            samples[i] = (binary.charCodeAt(i * 2) & 0xff) | (binary.charCodeAt(i * 2 + 1) << 8);
        }
        const buffer = context.createBuffer(1, samples.length, 24000);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
        const source = context.createBufferSource();
        source.buffer = buffer;
        const rate = speechRateRef.current;
        source.playbackRate.value = rate;
        source.connect(context.destination);
        const startAt = Math.max(context.currentTime, nextAudioTimeRef.current);
        source.start(startAt);
        nextAudioTimeRef.current = startAt + buffer.duration / rate;
        isAiSpeakingRef.current = true;
        setIsSpeaking(true);
        source.onended = () => {
            if (context.currentTime >= nextAudioTimeRef.current - 0.05) {
                isAiSpeakingRef.current = false;
                setIsSpeaking(false);
            }
        };
    };

    // Live transcription can arrive in several finalized pieces for one speaker.
    // Keep adjacent pieces of the same speaker in one transcript bubble.
    const appendTranscript = (role: SavedMessage["role"], content: string) => {
        const text = content.trim();
        if (!text) return;
        if (role === "user" && activeCoreQuestionIndexRef.current > 0) {
            candidateAnsweredCurrentCoreRef.current = true;
        }

        const current = messagesRef.current;
        const previous = current[current.length - 1];
        if (previous?.role !== role) {
            const next = [...current, { role, content: text }];
            messagesRef.current = next;
            setMessages(next);
            return;
        }

        // Handle either incremental chunks or an update that repeats the full text.
        if (previous.content === text || previous.content.startsWith(text)) return;
        const mergedContent = text.startsWith(previous.content)
            ? text
            : `${previous.content} ${text}`;
        const next = [...current.slice(0, -1), { role, content: mergedContent }];
        messagesRef.current = next;
        setMessages(next);
    };

    // feedback generation function (top-level so other handlers can call it)
    const generateFeedback = async () => {
        if (!interviewId || !userId) {
            console.error("❌ Missing interviewId or userId:", { interviewId, userId });
            setError("Something went wrong: Missing interview or user information.");
            return;
        }

        if (feedbackGeneratedRef.current) {
            // already generated
            return;
        }

        if (!messagesRef.current.length) return;

        feedbackGeneratedRef.current = true;
        setIsGeneratingFeedback(true);

        // Allow the final transcription event to arrive after the voice session closes.
        await new Promise((res) => setTimeout(res, 500));

        try {
            const transcript = [...messagesRef.current];
            if (!transcript.length) {
                feedbackGeneratedRef.current = false;
                return;
            }
            const reason = completionReasonRef.current;
            const sessionProgress: SessionProgressInput | undefined = reason ? {
                reason,
                completedCoreQuestions: coreQuestionsCompletedRef.current,
                totalCoreQuestions: coreQuestionCountRef.current,
                skippedCoreQuestions: coreQuestionsSkippedRef.current,
                completedExtraQuestions: extraQuestionsCompletedRef.current,
                queuedExtraQuestions: extraQuestionsRequestedRef.current,
                answeredCoreQuestionIndexes: [...answeredCoreQuestionIndexesRef.current],
                skippedCoreQuestionIndexes: [...skippedCoreQuestionIndexesRef.current],
            } : undefined;
            const saved = await saveInterviewTranscript(interviewId, transcript, sessionProgress);
            if (!saved.success) {
                setTranscriptSaveStatus("error");
                setError(saved.error || "Could not save the transcript.");
                feedbackGeneratedRef.current = false;
                return;
            }
            setTranscriptSaveStatus("saved");
            setError((current) => current?.startsWith("The latest transcript turn could not be autosaved.") ? null : current);

            const result = await createFeedback({
                interviewId,
                userId,
                transcript,
                ...(sessionProgress ? { sessionProgress } : {}),
            });
            if (result.success && result.feedbackId) {
                router.push(`/interview/${interviewId}/feedback`);
            } else {
                setError(result.error || "Could not generate feedback. Your transcript is saved; try again.");
                feedbackGeneratedRef.current = false;
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not save the interview. Try again.");
            feedbackGeneratedRef.current = false;
        } finally {
            setIsGeneratingFeedback(false);
        }
    };

    // Auto-generate when call ends + messages exist
    useEffect(() => {
        if (callStatus === CallStatus.FINISHED && !isClosingSession && messages.length > 0 && !feedbackGeneratedRef.current) {
            generateFeedback();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [callStatus, isClosingSession, messages]);

    const handleCall = async () => {
        const sessionId = ++sessionIdRef.current;
        let connectedSession: Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null = null;
        try {
            setError(null);
            setTranscriptSaveStatus("idle");
            setCallStatus(CallStatus.CONNECTING);
            const context = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = context;
            await context.resume();
            if (!streamRef.current?.active) streamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
            });
            if (micMeterTimerRef.current) clearInterval(micMeterTimerRef.current);
            void micCheckContextRef.current?.close();
            micCheckContextRef.current = null;

            // Set up microphone capture before opening the remote Live session. If local audio
            // capture is unavailable, we can fail cleanly without having the interviewer ask
            // a question that the candidate cannot answer.
            const source = context.createMediaStreamSource(streamRef.current);
            const sendAudioChunk = (input: Float32Array) => {
                if (sessionId !== sessionIdRef.current || !connectedSession) return;
                let sumSquares = 0;
                for (let i = 0; i < input.length; i++) sumSquares += input[i] * input[i];
                const inputLevel = Math.sqrt(sumSquares / Math.max(1, input.length));
                if (isAiSpeakingRef.current) {
                    if (userSpeakingTimerRef.current) clearTimeout(userSpeakingTimerRef.current);
                    setIsUserSpeaking(false);
                } else if (inputLevel > 0.025) {
                    setIsUserSpeaking(true);
                    if (userSpeakingTimerRef.current) clearTimeout(userSpeakingTimerRef.current);
                    userSpeakingTimerRef.current = setTimeout(() => setIsUserSpeaking(false), 320);
                }
                const pcm = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 32767;
                const bytes = new Uint8Array(pcm.buffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                connectedSession.sendRealtimeInput({ audio: { data: btoa(binary), mimeType: "audio/pcm;rate=16000" } });
            };

            let processor: AudioWorkletNode | ScriptProcessorNode;
            try {
                if (!context.audioWorklet || typeof AudioWorkletNode === "undefined") {
                    throw new Error("AudioWorklet is unavailable in this browser context.");
                }
                await context.audioWorklet.addModule("/worklets/live-audio-capture.js");
                const workletProcessor = new AudioWorkletNode(context, "live-audio-capture", {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                });
                workletProcessor.port.onmessage = (event: MessageEvent<Float32Array>) => sendAudioChunk(event.data);
                processor = workletProcessor;
            } catch (workletError) {
                // Keep voice practice available in browsers that cannot create an AudioWorkletNode.
                console.warn("AudioWorklet setup failed; using the compatible audio capture fallback.", workletError);
                const fallbackProcessor = context.createScriptProcessor(2048, 1, 1);
                fallbackProcessor.onaudioprocess = (event) => sendAudioChunk(event.inputBuffer.getChannelData(0));
                processor = fallbackProcessor;
            }
            processorRef.current = processor;
            source.connect(processor);
            const mutedOutput = context.createGain();
            mutedOutput.gain.value = 0;
            processor.connect(mutedOutput);
            mutedOutput.connect(context.destination);
            await context.resume();

            const tokenAbortController = new AbortController();
            const tokenTimeoutId = setTimeout(() => tokenAbortController.abort(), 60_000);
            let tokenResponse: Response;
            try {
                tokenResponse = await fetch("/api/gemini/session-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ interviewId }),
                    signal: tokenAbortController.signal,
                });
            } catch (cause) {
                if (tokenAbortController.signal.aborted) {
                    throw new Error("Preparing the interview took too long. Please try again.");
                }
                throw cause;
            } finally {
                clearTimeout(tokenTimeoutId);
            }
            const sessionData = await tokenResponse.json().catch(() => null);
            if (!tokenResponse.ok) {
                throw new Error(
                    typeof sessionData?.error === "string"
                        ? sessionData.error
                        : `Could not start the voice session (HTTP ${tokenResponse.status}).`
                );
            }
            const { token, instructions } = sessionData;
            coreQuestionCountRef.current = Array.isArray(sessionData.questions) ? sessionData.questions.length : 4;
            coreQuestionTextsRef.current = Array.isArray(sessionData.questions) ? sessionData.questions : [];
            coreQuestionsCompletedRef.current = 0;
            coreQuestionsProcessedRef.current = 0;
            coreQuestionsSkippedRef.current = 0;
            answeredCoreQuestionIndexesRef.current = [];
            skippedCoreQuestionIndexesRef.current = [];
            activeCoreQuestionIndexRef.current = 0;
            candidateAnsweredCurrentCoreRef.current = false;
            extraQuestionsRequestedRef.current = 0;
            extraQuestionsCompletedRef.current = 0;
            extraQuestionLimitRef.current = Math.max(0, Math.min(8, Number(sessionData.extraQuestionLimit) || 2));
            pendingFinishRef.current = false;
            finishCloseScheduledRef.current = false;
            timeLimitRequestedRef.current = false;
            completionReasonRef.current = null;
            setCompletionReason(null);
            if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
            setQuestionProgress({ core: 0, coreTotal: coreQuestionCountRef.current, skipped: 0, processed: 0, current: 0, extra: 0, extraCompleted: 0, extraLimit: extraQuestionLimitRef.current });
            setIsClosingSession(false);
            const ai = new GoogleGenAI({ apiKey: token });
            const connectionAttempt = ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: { parts: [{ text: instructions }] },
                    tools: sessionData.tools,
                },
                callbacks: {
                    onopen: () => {
                        if (sessionId === sessionIdRef.current) {
                            setCallStatus(CallStatus.ACTIVE);
                            timeLimitTimerRef.current = setTimeout(() => {
                                if (sessionId !== sessionIdRef.current || pendingFinishRef.current) return;
                                timeLimitRequestedRef.current = true;
                                completionReasonRef.current = "time_limit";
                                setCompletionReason("time_limit");
                                pendingFinishRef.current = true;
                                setIsClosingSession(true);
                                processorRef.current?.disconnect();
                                streamRef.current?.getTracks().forEach((track) => track.stop());
                                connectedSession?.sendClientContent({
                                turns: `The interview has reached its ${sessionData.durationMinutes || 10}-minute time limit. Please give a brief, polite closing now; do not ask another question.`,
                                    turnComplete: true,
                                });
                                finishCloseTimerRef.current = setTimeout(() => connectedSession?.close(), 10_000);
                            }, (sessionData.durationMinutes || 10) * 60 * 1000);
                        }
                    },
                    onmessage: (message) => {
                        if (sessionId !== sessionIdRef.current) return;
                        const serverContent = message.serverContent;
                        const inputText = serverContent?.inputTranscription?.text;
                        const outputText = serverContent?.outputTranscription?.text;
                        if (inputText?.trim()) {
                            appendTranscript("user", inputText);
                        }
                        if (outputText?.trim()) appendTranscript("assistant", outputText);
                        const functionCalls = [...(message.toolCall?.functionCalls || [])].sort((left, right) => {
                            const priority = (name: string | undefined) => name && ["complete_core_question", "skip_core_question", "complete_extra_question"].includes(name)
                                ? 0
                                : name === "finish_interview" ? 2 : 1;
                            return priority(left.name) - priority(right.name);
                        });
                        if (functionCalls.length && connectedSession) {
                            const functionResponses = functionCalls.map((call) => {
                                const args = call.args || {};
                                let result: Record<string, unknown>;
                                switch (call.name) {
                                    case "get_core_question": {
                                        const questionIndex = Number(args.questionIndex);
                                        const accepted = Number.isInteger(questionIndex)
                                            && questionIndex === coreQuestionsProcessedRef.current + 1
                                            && questionIndex <= coreQuestionCountRef.current
                                            && activeCoreQuestionIndexRef.current !== questionIndex;
                                        if (accepted) {
                                            activeCoreQuestionIndexRef.current = questionIndex;
                                            candidateAnsweredCurrentCoreRef.current = false;
                                            setQuestionProgress((current) => ({ ...current, current: questionIndex }));
                                        }
                                        result = {
                                            accepted,
                                            questionIndex,
                                            question: accepted ? coreQuestionTextsRef.current[questionIndex - 1] : undefined,
                                            instruction: accepted ? "Ask this exact prepared question verbatim and wait for the candidate's answer." : "Do not invent or repeat a core question. Continue from the currently active or next prepared question.",
                                        };
                                        break;
                                    }
                                    case "complete_core_question": {
                                        const questionIndex = Number(args.questionIndex);
                                        const expectedIndex = coreQuestionsProcessedRef.current + 1;
                                        const accepted = Number.isInteger(questionIndex)
                                            && questionIndex === expectedIndex
                                            && questionIndex <= coreQuestionCountRef.current
                                            && activeCoreQuestionIndexRef.current === questionIndex
                                            && candidateAnsweredCurrentCoreRef.current;
                                        if (accepted) {
                                            coreQuestionsProcessedRef.current = questionIndex;
                                            coreQuestionsCompletedRef.current += 1;
                                            answeredCoreQuestionIndexesRef.current.push(questionIndex);
                                            activeCoreQuestionIndexRef.current = 0;
                                            setQuestionProgress((current) => ({ ...current, core: coreQuestionsCompletedRef.current, processed: questionIndex, current: 0 }));
                                        }
                                        result = {
                                            accepted,
                                            completedCoreQuestions: coreQuestionsCompletedRef.current,
                                            processedCoreQuestions: coreQuestionsProcessedRef.current,
                                            coreQuestionsRemaining: Math.max(0, coreQuestionCountRef.current - coreQuestionsProcessedRef.current),
                                            instruction: accepted
                                                ? coreQuestionsProcessedRef.current < coreQuestionCountRef.current
                                                    ? "Continue with the next unanswered prepared question."
                                                    : extraQuestionsCompletedRef.current < extraQuestionsRequestedRef.current
                                                        ? "All prepared questions are handled. Ask the next explicitly requested extra question now, then record its answer."
                                                        : "All prepared questions are handled. Call finish_interview with reason planned_complete now, then give a brief closing. Do not offer more questions."
                                                : "Do not skip or repeat questions; continue from the next unanswered prepared question.",
                                        };
                                        break;
                                    }
                                    case "skip_core_question": {
                                        const questionIndex = Number(args.questionIndex);
                                        const expectedIndex = coreQuestionsProcessedRef.current + 1;
                                        const accepted = Number.isInteger(questionIndex)
                                            && questionIndex === expectedIndex
                                            && questionIndex <= coreQuestionCountRef.current
                                            && activeCoreQuestionIndexRef.current === questionIndex;
                                        if (accepted) {
                                            coreQuestionsProcessedRef.current = questionIndex;
                                            coreQuestionsSkippedRef.current += 1;
                                            skippedCoreQuestionIndexesRef.current.push(questionIndex);
                                            activeCoreQuestionIndexRef.current = 0;
                                            setQuestionProgress((current) => ({ ...current, skipped: coreQuestionsSkippedRef.current, processed: questionIndex, current: 0 }));
                                        }
                                        result = {
                                            accepted,
                                            skippedCoreQuestions: coreQuestionsSkippedRef.current,
                                            processedCoreQuestions: coreQuestionsProcessedRef.current,
                                            instruction: accepted
                                                ? coreQuestionsProcessedRef.current < coreQuestionCountRef.current
                                                    ? "Continue with the next prepared question. Do not count the skipped question as answered or use it as negative evidence."
                                                    : extraQuestionsCompletedRef.current < extraQuestionsRequestedRef.current
                                                        ? "All prepared questions are handled. Ask the next explicitly requested extra question now, then record its answer."
                                                        : "All prepared questions are handled. Call finish_interview with reason planned_complete now, then give a brief closing. Do not offer more questions."
                                                : "Only record the next prepared question as skipped when the candidate explicitly chose to skip it.",
                                        };
                                        break;
                                    }
                                    case "request_extra_question": {
                                        const allowed = extraQuestionsRequestedRef.current < extraQuestionLimitRef.current;
                                        const plannedItems = Array.isArray(sessionData.questionPlan) ? sessionData.questionPlan : [];
                                        const allowedExtraScope = sessionData.mode === "subject"
                                            ? `Stay within the single subject ${sessionData.subject} and only these planned topics: ${[...new Set(plannedItems.map((item: { topic?: string }) => item.topic).filter(Boolean))].join(", ")}.`
                                            : sessionData.mode === "cse"
                                                ? `Use only these planned subject/topic pairs: ${plannedItems.map((item: { subject?: string; topic?: string }) => `${item.subject}: ${item.topic}`).join("; ")}.`
                                                : "Stay within the selected role and skill focus.";
                                        if (allowed) {
                                            extraQuestionsRequestedRef.current += 1;
                                            setQuestionProgress((current) => ({ ...current, extra: extraQuestionsRequestedRef.current }));
                                        }
                                        result = {
                                            allowed,
                                            queuedExtraQuestions: extraQuestionsRequestedRef.current,
                                            extraQuestionsRemaining: Math.max(0, extraQuestionLimitRef.current - extraQuestionsRequestedRef.current),
                                            instruction: allowed
                                                ? `Queue one original, relevant question. ${allowedExtraScope} ${coreQuestionsProcessedRef.current < coreQuestionCountRef.current ? "Finish any remaining prepared questions first, then ask this extra question." : "Ask this extra question now, then call complete_extra_question after the candidate answers."}`
                                                : `The ${extraQuestionLimitRef.current}-question extra limit has been reached. Do not queue another; continue or finish according to the candidate's intent.`,
                                        };
                                        break;
                                    }
                                    case "complete_extra_question": {
                                        const accepted = coreQuestionsProcessedRef.current >= coreQuestionCountRef.current
                                            && extraQuestionsCompletedRef.current < extraQuestionsRequestedRef.current;
                                        if (accepted) {
                                            extraQuestionsCompletedRef.current += 1;
                                            setQuestionProgress((current) => ({ ...current, extraCompleted: extraQuestionsCompletedRef.current }));
                                        }
                                        result = {
                                            accepted,
                                            completedExtraQuestions: extraQuestionsCompletedRef.current,
                                            queuedExtraQuestions: extraQuestionsRequestedRef.current,
                                            instruction: accepted
                                                ? extraQuestionsCompletedRef.current < extraQuestionsRequestedRef.current
                                                    ? "Ask the next queued extra question now."
                                                    : "All prepared and explicitly requested extra questions are handled. Call finish_interview with reason planned_complete now and give a brief closing. Do not offer more questions."
                                                : "Finish the core questions and ask only an approved, unanswered extra question.",
                                        };
                                        break;
                                    }
                                    case "finish_interview": {
                                        const reason = args.reason;
                                        const candidateRequested = reason === "candidate_requested";
                                        const plannedQuestionsComplete = coreQuestionsProcessedRef.current >= coreQuestionCountRef.current
                                            && extraQuestionsCompletedRef.current >= extraQuestionsRequestedRef.current;
                                        const accepted = candidateRequested || timeLimitRequestedRef.current
                                            || (reason === "planned_complete" && plannedQuestionsComplete);
                                        if (accepted) {
                                            const finalReason = timeLimitRequestedRef.current
                                                ? "time_limit"
                                                : reason === "planned_complete"
                                                    ? "planned_complete"
                                                    : "candidate_requested";
                                            completionReasonRef.current = finalReason;
                                            setCompletionReason(finalReason);
                                            pendingFinishRef.current = true;
                                            setIsClosingSession(true);
                                        }
                                        result = {
                                            accepted,
                                            earlyFinish: accepted && !plannedQuestionsComplete,
                                            completedCoreQuestions: coreQuestionsCompletedRef.current,
                                            skippedCoreQuestions: coreQuestionsSkippedRef.current,
                                            processedCoreQuestions: coreQuestionsProcessedRef.current,
                                            totalCoreQuestions: coreQuestionCountRef.current,
                                            completedExtraQuestions: extraQuestionsCompletedRef.current,
                                            queuedExtraQuestions: extraQuestionsRequestedRef.current,
                                            instruction: accepted
                                                ? "Give a short, polite spoken closing now. Do not ask another question. The app will close the session after your closing audio finishes."
                                                : "The prepared questions are not complete. Continue with the next unanswered question before ending, unless the candidate explicitly asks to stop.",
                                        };
                                        break;
                                    }
                                    default:
                                        result = { accepted: false, instruction: "Unknown interview action. Continue the interview normally." };
                                }
                                return { id: call.id, name: call.name, response: result };
                            });
                            connectedSession.sendToolResponse({ functionResponses });
                        }
                        const parts = serverContent?.modelTurn?.parts || [];
                        for (const part of parts) {
                            if (part.inlineData?.data) void playPcmAudio(part.inlineData.data, context);
                        }
                        if (pendingFinishRef.current && serverContent?.turnComplete && !finishCloseScheduledRef.current) {
                            finishCloseScheduledRef.current = true;
                            const remainingAudioMs = Math.max(0, (nextAudioTimeRef.current - context.currentTime) * 1000);
                            finishCloseTimerRef.current = setTimeout(() => {
                                if (sessionId === sessionIdRef.current) connectedSession?.close();
                            }, Math.min(remainingAudioMs + 200, 10_000));
                        }
                    },
                    onerror: (event) => {
                        if (sessionId === sessionIdRef.current) {
                            console.error("Gemini Live reported a voice session error:", event.message);
                            setError("The voice connection reported a problem. Check your connection; if the session ended, your transcript will be saved and feedback can be retried.");
                        }
                    },
                    onclose: () => {
                        if (sessionId !== sessionIdRef.current) return;
                        if (!completionReasonRef.current) {
                            completionReasonRef.current = "connection_lost";
                            setCompletionReason("connection_lost");
                            setError(messagesRef.current.length
                                ? "The voice connection ended unexpectedly. We’ll try to create provisional feedback from the transcript recorded so far."
                                : "The voice connection ended before a transcript was recorded. Check your connection and microphone, then restart the interview.");
                        }
                        setCallStatus(CallStatus.FINISHED);
                        if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
                        streamRef.current?.getTracks().forEach((track) => track.stop());
                        processorRef.current?.disconnect();
                        const activeContext = audioContextRef.current;
                        if (pendingFinishRef.current && activeContext) {
                            const remainingAudioMs = Math.max(0, (nextAudioTimeRef.current - activeContext.currentTime) * 1000);
                            finishCloseTimerRef.current = setTimeout(() => {
                                void activeContext.close();
                                if (audioContextRef.current === activeContext) audioContextRef.current = null;
                                pendingFinishRef.current = false;
                                setIsClosingSession(false);
                            }, remainingAudioMs + 100);
                        } else {
                            void activeContext?.close();
                            audioContextRef.current = null;
                        }
                    },
                },
            });
            // A Live connection that never opens must not leave the page stuck on “Calling…”.
            // If it opens after the timeout or page cleanup, close that late session immediately.
            void connectionAttempt.then((lateSession) => {
                if (sessionId !== sessionIdRef.current) lateSession.close();
            }).catch(() => undefined);
            let connectionTimeoutId: ReturnType<typeof setTimeout> | undefined;
            try {
                connectedSession = await Promise.race([
                    connectionAttempt,
                    new Promise<never>((_, reject) => {
                        connectionTimeoutId = setTimeout(
                            () => reject(new Error("The AI interviewer did not connect within 30 seconds. Check your connection and try again.")),
                            30_000,
                        );
                    }),
                ]);
            } finally {
                if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
            }
            liveSessionRef.current = connectedSession;
            connectedSession.sendClientContent({ turns: `Begin now. Greet the candidate briefly and ask the first planned question.`, turnComplete: true });
        } catch (err) {
            if (sessionId !== sessionIdRef.current) return;
            console.error("Gemini Live connection failed:", err);
            setError(getVoiceErrorMessage(err));
            sessionIdRef.current += 1;
            setCallStatus(CallStatus.INACTIVE);
            if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
            if (micMeterTimerRef.current) clearInterval(micMeterTimerRef.current);
            micMeterTimerRef.current = null;
            setMicReady(false);
            setMicLevel(0);
            setMicStatus("Check your microphone again before retrying.");
            processorRef.current?.disconnect();
            processorRef.current = null;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            void micCheckContextRef.current?.close();
            micCheckContextRef.current = null;
            (connectedSession ?? liveSessionRef.current)?.close();
            liveSessionRef.current = null;
            void audioContextRef.current?.close();
            audioContextRef.current = null;
        }
    };

    const handleDisconnect = async () => {
        completionReasonRef.current = "manual_finish";
        setCompletionReason("manual_finish");
        pendingFinishRef.current = false;
        if (userSpeakingTimerRef.current) clearTimeout(userSpeakingTimerRef.current);
        setIsUserSpeaking(false);
        finishCloseScheduledRef.current = true;
        if (finishCloseTimerRef.current) clearTimeout(finishCloseTimerRef.current);
        if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
        setIsClosingSession(false);
        setCallStatus(CallStatus.FINISHED);
        processorRef.current?.disconnect();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        liveSessionRef.current?.close();
        void audioContextRef.current?.close();
        audioContextRef.current = null;

        // Generate feedback immediately if user clicks Finish Interview
        if (!feedbackGeneratedRef.current && messagesRef.current.length > 0) {
            await generateFeedback();
        }
    };

    const retryTranscriptSave = async () => {
        if (!messagesRef.current.length) return;
        setTranscriptSaveStatus("saving");
        try {
            const result = await saveInterviewTranscript(interviewId, [...messagesRef.current]);
            if (!result.success) throw new Error(result.error || "Could not save the transcript.");
            setTranscriptSaveStatus("saved");
            setError((current) => current?.startsWith("The latest transcript turn could not be autosaved.") ? null : current);
        } catch (cause) {
            setTranscriptSaveStatus("error");
            setError(cause instanceof Error ? cause.message : "Could not save the transcript. Try again.");
        }
    };

    const handleRestart = async () => {
        sessionIdRef.current += 1;
        if (userSpeakingTimerRef.current) clearTimeout(userSpeakingTimerRef.current);
        setIsUserSpeaking(false);
        pendingFinishRef.current = false;
        finishCloseScheduledRef.current = false;
        if (finishCloseTimerRef.current) clearTimeout(finishCloseTimerRef.current);
        if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current);
        timeLimitRequestedRef.current = false;
        completionReasonRef.current = null;
        setCompletionReason(null);
        activeCoreQuestionIndexRef.current = 0;
        candidateAnsweredCurrentCoreRef.current = false;
        setIsClosingSession(false);
        processorRef.current?.disconnect();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        liveSessionRef.current?.close();
        void audioContextRef.current?.close();
        audioContextRef.current = null;
        setMessages([]);
        messagesRef.current = [];
        setCallStatus(CallStatus.INACTIVE);
        feedbackGeneratedRef.current = false;
        await handleCall();
    };

    if (isGeneratingFeedback) {
        return (
            <div className="w-full flex flex-col items-center justify-center mt-10">
                <p className="text-lg font-semibold text-gray-700 animate-pulse">
                    Generating feedback, please wait...
                </p>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div role="alert" className="my-3 w-full rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-50 sm:px-5">
                    <p className="font-semibold text-amber-100">
                        {error.toLowerCase().includes("transcript") ? "Session recovery information" : "There was a problem"}
                    </p>
                    <p className="mt-1 leading-6 text-white/75">{error}</p>
                    {callStatus === CallStatus.INACTIVE && <p className="mt-1 text-xs text-white/55">Your interview has not started. Correct the issue above and select Start an Interview to retry.</p>}
                    {callStatus === CallStatus.FINISHED && messages.length > 0 && !error.toLowerCase().includes("saved") && <p className="mt-1 text-xs text-white/55">You can still retry feedback from the transcript below.</p>}
                </div>
            )}

            {callStatus === CallStatus.INACTIVE && !textInterview && !initialTranscript.some((turn) => turn.role === "user" && turn.content.trim()) && <section className="my-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4" aria-label="Microphone readiness check">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-white">Before you begin</p><p className="mt-1 text-xs text-white/55">Check microphone access and connection. Your answers appear as live captions below.</p></div><button type="button" onClick={() => void checkMicrophone()} className="min-h-10 shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-white hover:bg-white/[0.11]">{micReady ? "Check mic again" : "Check microphone"}</button></div>
                {micReady && <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-300 transition-[width]" style={{ width: `${Math.max(6, micLevel)}%` }} /></div><span className="text-xs text-emerald-200">Ready</span></div>}
                {micStatus && <p role="status" className={`mt-2 text-xs ${micReady ? "text-emerald-200/80" : "text-amber-200"}`}>{micStatus}</p>}
                <label className="mt-3 inline-flex items-center gap-2 text-xs text-white/65">Interviewer speaking pace<select value={speechRate} onChange={(event) => updateSpeechRate(event.target.value)} className="h-9 rounded-lg border border-white/10 bg-[#17131f] px-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"><option value="0.85">Slower</option><option value="1">Normal</option><option value="1.15">Faster</option></select></label>
                <button type="button" onClick={() => void startTextInterview()} className="mt-3 min-h-9 rounded-full border border-purple-200/20 px-3.5 text-xs font-semibold text-purple-100 hover:bg-purple-200/[0.08]">Use text-only interview</button>
            </section>}

            {textInterview && <section className="relative my-4 overflow-hidden rounded-[1.65rem] border border-purple-200/20 bg-[#121019] p-5 shadow-[0_22px_60px_-38px_rgba(0,0,0,0.95)] sm:p-7" aria-labelledby="text-interview-heading">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-pink-200/70 to-transparent" />
                <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Text-based interview</p>
                            <h2 id="text-interview-heading" className="mt-1 text-lg font-semibold text-white sm:text-xl">Question {textInterview.index + 1} of {textInterview.questions.length}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-white/65"><Clock3 size={13} aria-hidden="true" />{textInterview.durationMinutes} min limit</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/55">{textInterview.answers.length} answered · {textInterview.skipped.length} skipped</span>
                        </div>
                    </div>

                    <div className="mt-4" aria-label={`Question progress: ${textInterview.answers.length + textInterview.skipped.length} of ${textInterview.questions.length} handled`}>
                        <div role="progressbar" aria-label="Text interview question progress" aria-valuemin={0} aria-valuemax={textInterview.questions.length} aria-valuenow={textInterview.answers.length + textInterview.skipped.length} className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-300 to-pink-300 transition-[width] duration-300" style={{ width: `${((textInterview.answers.length + textInterview.skipped.length) / textInterview.questions.length) * 100}%` }} />
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-200/80">Question {String(textInterview.index + 1).padStart(2, "0")}</p>
                        <p className="mt-2 text-base leading-7 text-white/90 sm:text-lg sm:leading-8">{textInterview.questions[textInterview.index]}</p>
                    </div>

                    <div className="mt-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <label className="text-sm font-semibold text-white" htmlFor="typed-interview-answer">Your answer</label>
                            <span className="text-[11px] text-white/40">Type or speak; you can edit the text</span>
                        </div>
                        <textarea
                            id="typed-interview-answer"
                            value={textInterview.draft}
                            onChange={(event) => {
                                const draft = event.target.value;
                                textDraftRef.current = draft;
                                setDictationError("");
                                if (dictationActiveRef.current) {
                                    dictationBaseRef.current = draft;
                                    dictationFinalRef.current = "";
                                    dictationInterimRef.current = "";
                                }
                                setTextInterview({ ...textInterview, draft });
                            }}
                            rows={6}
                            maxLength={6000}
                            placeholder="Explain your approach, reasoning, and examples…"
                            className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-white/15 bg-black/20 p-4 text-base leading-7 text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 sm:p-5"
                        />
                        <div className="mt-2 flex justify-end text-[10px] tabular-nums text-white/35">{textInterview.draft.length.toLocaleString()} / 6,000</div>

                        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                            <button
                                type="button"
                                onClick={isDictating ? stopVoiceTyping : startVoiceTyping}
                                disabled={isStoppingDictation}
                                aria-pressed={isDictating}
                                className={cn(
                                    "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold",
                                    isDictating
                                        ? "border-rose-300/35 bg-rose-300/[0.12] text-rose-100 hover:bg-rose-300/[0.18]"
                                        : "border-pink-200/20 bg-gradient-to-r from-violet-200/[0.09] to-pink-300/[0.12] text-pink-100 hover:border-pink-200/35 hover:from-violet-200/[0.14] hover:to-pink-300/[0.18]"
                                )}
                            >
                                {isDictating ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
                                {isStoppingDictation ? "Finishing voice input…" : isDictating ? "Stop voice input" : "Answer with microphone"}
                                {isDictating && !isStoppingDictation && <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-rose-200" />}
                            </button>
                            <p className="max-w-xl text-xs leading-5 text-white/45">Voice typing uses your browser’s speech recognition. Review and edit the transcript before submitting.</p>
                        </div>
                        {dictationStatus && <p role="status" aria-live="polite" className="mt-2 text-xs text-emerald-200/85">{dictationStatus}</p>}
                        {dictationError && <p role="alert" className="mt-2 text-xs leading-5 text-amber-200">{dictationError}</p>}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.08] pt-4">
                        <button type="button" disabled={isDictating} onClick={submitTextAnswer} className="min-h-11 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-5 text-sm font-bold text-[#17121d] shadow-md hover:brightness-105 disabled:cursor-not-allowed">{textInterview.index + 1 >= textInterview.questions.length ? "Submit answer & get feedback" : "Save answer & continue"}</button>
                        <button type="button" disabled={isDictating} onClick={skipTextQuestion} className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/75 hover:bg-white/[0.06]">{textInterview.index + 1 >= textInterview.questions.length ? "Skip & get feedback" : "Skip question"}</button>
                        {textInterview.answers.length > 0 && <button type="button" disabled={isDictating} onClick={finishTextEarly} className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-semibold text-white/75 hover:bg-white/[0.06]">Finish early</button>}
                        {isDictating && <p className="self-center text-xs text-white/45">{isStoppingDictation ? "Wait for voice input to finish before continuing." : "Stop voice input to continue."}</p>}
                    </div>
                </div>
            </section>}
            {callStatus === CallStatus.INACTIVE && initialTranscript.some((turn) => turn.role === "user" && turn.content.trim()) && <section className="my-4 rounded-2xl border border-amber-200/15 bg-amber-300/[0.05] p-4" aria-label="Recover saved interview">
                <p className="text-sm font-semibold text-amber-100">Saved answers found</p><p className="mt-1 text-sm leading-6 text-white/65">This interview has a saved transcript without a feedback report. Generate a provisional report from the saved answers to recover the session.</p><button type="button" onClick={() => { messagesRef.current = initialTranscript; setMessages(initialTranscript); if (initialSessionProgress) { coreQuestionsCompletedRef.current = initialSessionProgress.completedCoreQuestions; coreQuestionCountRef.current = initialSessionProgress.totalCoreQuestions; coreQuestionsSkippedRef.current = initialSessionProgress.skippedCoreQuestions; extraQuestionsCompletedRef.current = initialSessionProgress.completedExtraQuestions; extraQuestionsRequestedRef.current = initialSessionProgress.queuedExtraQuestions; answeredCoreQuestionIndexesRef.current = initialSessionProgress.answeredCoreQuestionIndexes || []; skippedCoreQuestionIndexesRef.current = initialSessionProgress.skippedCoreQuestionIndexes || []; completionReasonRef.current = initialSessionProgress.reason; setCompletionReason(initialSessionProgress.reason); } else { completionReasonRef.current = "connection_lost"; setCompletionReason("connection_lost"); } void generateFeedback(); }} className="mt-3 min-h-10 rounded-full bg-gradient-to-r from-purple-200 to-pink-300 px-4 text-sm font-bold text-[#17121d]">Generate feedback from saved transcript</button>
            </section>}

            {!textInterview && <div className="call-view">
                <section className={cn("speaker-card speaker-card--ai", callStatus === CallStatus.ACTIVE && "speaker-card--connected", isSpeaking && "speaker-card--speaking")} aria-label="AI Interviewer speaker card">
                    <div className="speaker-card-topline">
                        <span className="speaker-card-kind">Interviewer</span>
                        <span className="speaker-status" aria-live="polite">
                            <span className={cn("speaker-status-dot", (callStatus === CallStatus.ACTIVE || callStatus === CallStatus.CONNECTING) && "speaker-status-dot--live", isSpeaking && "speaker-status-dot--speaking")} aria-hidden="true" />
                            {isSpeaking ? "Speaking" : callStatus === CallStatus.ACTIVE ? "Listening" : callStatus === CallStatus.CONNECTING ? "Connecting" : "Ready"}
                        </span>
                    </div>
                    <div className="speaker-card-center">
                        <div className="speaker-avatar speaker-avatar--ai">
                            <Image src="/logo.svg" alt="PulseAI Prep logo" width={88} height={88} className="speaker-logo" />
                            {isSpeaking && <span className="user-speaking-pulse ai-speaking-pulse" aria-hidden="true" />}
                        </div>
                        <h3>AI Interviewer</h3>
                        <p>Voice-led interview practice</p>
                    </div>
                </section>

                <section className={cn("speaker-card speaker-card--candidate", callStatus === CallStatus.ACTIVE && "speaker-card--connected", isUserSpeaking && "speaker-card--speaking")} aria-label={`${userName} candidate speaker card`}>
                    <div className="speaker-card-topline">
                        <span className="speaker-card-kind">Candidate</span>
                        <span className="speaker-status" aria-live="polite">
                            <span className={cn("speaker-status-dot", (callStatus === CallStatus.ACTIVE || callStatus === CallStatus.CONNECTING) && "speaker-status-dot--live", isUserSpeaking && "speaker-status-dot--speaking")} aria-hidden="true" />
                            {isUserSpeaking ? "Speaking" : callStatus === CallStatus.ACTIVE ? "Your turn" : callStatus === CallStatus.CONNECTING ? "Joining" : "Ready"}
                        </span>
                    </div>
                    <div className="speaker-card-center">
                        <div className="speaker-avatar speaker-avatar--candidate">
                            <Image src="/user-avatar.jpg" alt="" width={540} height={540} className="speaker-photo" />
                            {isUserSpeaking && <span className="user-speaking-pulse" aria-hidden="true" />}
                        </div>
                        <h3>{userName}</h3>
                        <p>{isUserSpeaking ? "Your answer is being captured" : "Your interview seat"}</p>
                    </div>
                </section>
            </div>}

            {/* Live transcript grouped by speaker with the newest turn marked. */}
            {messages.length > 0 && (
                <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c13]/80" aria-labelledby="live-transcript-heading">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                        <div>
                            <h2 id="live-transcript-heading" className="text-sm font-semibold text-white">Live transcript</h2>
                            <p className="mt-0.5 text-xs text-white/45">Live captions · latest speaker turn appears at the bottom.</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            {callStatus === CallStatus.ACTIVE && <label className="inline-flex items-center gap-1.5 text-[10px] text-white/50">Pace<select value={speechRate} onChange={(event) => updateSpeechRate(event.target.value)} className="h-7 rounded-md border border-white/10 bg-[#17131f] px-1.5 text-white"><option value="0.85">Slow</option><option value="1">Normal</option><option value="1.15">Fast</option></select></label>}
                            <button type="button" onClick={() => setCaptionLarge((current) => !current)} aria-pressed={captionLarge} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/65 hover:bg-white/[0.07]">{captionLarge ? "Smaller text" : "Larger text"}</button>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/60">{messages.length} turn{messages.length === 1 ? "" : "s"}</span>
                            {transcriptSaveStatus !== "idle" && <span className={cn("text-[10px] font-medium", transcriptSaveStatus === "error" ? "text-amber-200" : "text-white/45")}>{transcriptSaveStatus === "saving" ? "Saving transcript…" : transcriptSaveStatus === "saved" ? "Transcript saved" : "Save needs attention"}</span>}
                        </div>
                    </div>
                    <div ref={transcriptContainerRef} className="max-h-72 overflow-y-auto p-3 sm:p-4" aria-live="polite" aria-relevant="additions text">
                    <ol className="flex flex-col gap-2.5">
                        {messages.map((msg, index) => (
                            <li
                                key={index}
                                className={cn(
                                    "animate-fadeIn rounded-xl border border-l-2 px-3.5 py-3 transition-colors sm:px-4",
                                    msg.role === "assistant"
                                        ? "border-white/10 border-l-pink-300/80 bg-fuchsia-300/[0.055]"
                                        : "border-white/10 border-l-violet-300/80 bg-violet-300/[0.055]"
                                )}
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <p className={cn("text-xs font-semibold", msg.role === "assistant" ? "text-pink-200" : "text-violet-200")}>
                                        {msg.role === "assistant" ? "AI Interviewer" : "You"}
                                    </p>
                                    {index === messages.length - 1 && <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">Latest</span>}
                                </div>
                                <p className={cn("whitespace-pre-wrap break-words leading-6 text-white/85", captionLarge ? "text-base sm:text-lg" : "text-sm")}>{msg.content}</p>
                            </li>
                        ))}
                    </ol>
                    </div>
                </section>
            )}

            {!textInterview && (callStatus === CallStatus.ACTIVE || callStatus === CallStatus.FINISHED) && questionProgress.coreTotal > 0 && (
                <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 sm:px-5" aria-label="Interview question progress" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold text-white">{callStatus === CallStatus.ACTIVE
                            ? (isClosingSession ? "Wrapping up your interview" : "Interview in progress")
                            : completionReason === "planned_complete"
                                ? "Interview complete"
                                : completionReason === "time_limit"
                                    ? "Time limit reached"
                                    : completionReason === "connection_lost"
                                        ? "Connection lost"
                                        : "Interview ended early"}</p>
                        <p className="text-xs text-white/55">{questionProgress.processed} of {questionProgress.coreTotal} core questions handled</p>
                    </div>
                    <div role="progressbar" aria-label="Core question progress" aria-valuemin={0} aria-valuemax={questionProgress.coreTotal} aria-valuenow={questionProgress.processed} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-400 transition-[width] duration-300" style={{ width: `${Math.min(100, (questionProgress.processed / questionProgress.coreTotal) * 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/60">
                        {questionProgress.current > 0 && callStatus === CallStatus.ACTIVE ? `On question ${questionProgress.current} of ${questionProgress.coreTotal} · ` : ""}
                        {questionProgress.core} answered · {questionProgress.skipped} skipped · {Math.max(0, questionProgress.coreTotal - questionProgress.processed)} remaining
                        {questionProgress.extra > 0 ? ` · ${questionProgress.extraCompleted}/${questionProgress.extra} extra questions answered` : ""}
                        {isClosingSession ? " · Waiting for the interviewer’s closing…" : ""}
                        {callStatus === CallStatus.FINISHED && completionReason === "connection_lost" ? " · The assessment will be marked provisional." : ""}
                    </p>
                </section>
            )}


            {!textInterview && <div className="mt-5 flex w-full flex-wrap justify-center gap-3 sm:gap-4">
                {callStatus !== CallStatus.ACTIVE ? (
                    <button disabled={callStatus === CallStatus.CONNECTING || !micReady} className="relative btn-call bg-gradient-to-r from-purple-200 to-pink-400 hover:brightness-105 text-black font-bold rounded-full shadow-md disabled:cursor-wait disabled:opacity-70" onClick={handleCall}>
                        <span className={cn("absolute animate-ping rounded-full opacity-75", callStatus !== CallStatus.CONNECTING && "hidden")} />
                        <span>{callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED ? micReady ? "Start an Interview" : "Check microphone first" : "Calling.."}</span>
                    </button>
                ) : (
                    <button className="btn-disconnect bg-red-500 hover:bg-red-700 text-black font-bold rounded-full shadow-md" onClick={handleDisconnect}>
                        Finish Interview
                    </button>
                )}

                {(callStatus === CallStatus.FINISHED || callStatus === CallStatus.ACTIVE) && (
                    <button className="btn-disconnect text-black bg-gradient-to-r from-purple-200 to-pink-400 font-bold rounded-full shadow-md" onClick={handleRestart}>
                        Restart an Interview
                    </button>
                )}

                {error && callStatus === CallStatus.FINISHED && messages.length > 0 && (
                    <button className="btn-disconnect rounded-full bg-white px-5 py-2 font-semibold text-black" onClick={generateFeedback}>
                        Retry saving and feedback
                    </button>
                )}
                {transcriptSaveStatus === "error" && callStatus === CallStatus.ACTIVE && (
                    <button className="btn-disconnect rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 font-semibold text-white" onClick={retryTranscriptSave}>
                        Retry transcript save
                    </button>
                )}
            </div>}
        </>
    );
};

export default Agent;
