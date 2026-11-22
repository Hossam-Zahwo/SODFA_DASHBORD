import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function speechConstructor() {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function VoiceInput({
  onTranscript,
  disabled = false,
  prompt = "جاري الاستماع…",
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  prompt?: string;
}) {
  const recognition = useRef<Recognition | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  useEffect(() => {
    setVoiceAvailable(Boolean(speechConstructor()));
    return () => {
      const active = recognition.current;
      if (!active) return;
      active.onresult = active.onerror = active.onend = null;
      recognition.current = null;
      active.abort();
    };
  }, []);

  function toggleVoice() {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const SpeechRecognition = speechConstructor();
    if (!SpeechRecognition) return;
    const active = new SpeechRecognition();
    active.lang = "ar-EG";
    active.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript?.trim()) onTranscript(transcript.trim());
    };
    active.onerror = ({ error }) => {
      setVoiceMessage(
        error === "not-allowed" || error === "service-not-allowed"
          ? "اسمح للمتصفح باستخدام الميكروفون أو اكتب اسم المنتج."
          : "تعذّر تحويل الصوت لنص. جرّب تاني أو اكتب اسم المنتج.",
      );
    };
    active.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = active;
    try {
      active.start();
      setVoiceMessage("");
      setListening(true);
    } catch {
      recognition.current = null;
      setVoiceMessage("الميكروفون مش متاح دلوقتي.");
    }
  }

  return (
    <div>
      {voiceAvailable && (
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={listening}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg border border-[#53505a] px-3 py-2 text-sm"
        >
          {listening ? <Square size={16} /> : <Mic size={16} />}
          {listening ? "إيقاف الاستماع" : "إملاء صوتي"}
        </button>
      )}
      {(listening || voiceMessage) && (
        <p className="mt-3 text-sm" role="status">
          {voiceMessage || prompt}
        </p>
      )}
    </div>
  );
}
