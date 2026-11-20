import { useNavigate } from 'react-router-dom';
import { Volume2, Trash2, MessageSquare, ShieldCheck } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { AccessibleButton } from '../components/common/AccessibleButton';
import { useAssistant } from '../context/AssistantContext';
import { useSpeech } from '../context/SpeechContext';
import { getIntentDisplayName } from '../services/intentRouter';

export function HistoryScreen() {
  const navigate = useNavigate();
  const { messages, clearHistory } = useAssistant();
  const { speak, stopSpeaking } = useSpeech();

  const handleClear = () => {
    stopSpeaking();
    clearHistory();
    speak('Conversation history cleared.');
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader
        title="Conversation History"
        showBack
        backTo="/home"
        rightSlot={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear session history"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-anya-danger shadow-card hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null
        }
      />

      <main className="anya-scroll flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-anya-soft/80 px-3.5 py-2.5 text-xs text-anya-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-anya-primary" aria-hidden="true" />
          <span>
            Stored only for this active session. Raw voice recordings and photos are never saved.
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="anya-card flex flex-col items-center rounded-3xl border border-anya-border bg-white px-5 py-10 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-extrabold text-anya-ink">No conversations yet</h2>
            <p className="mt-1 text-xs leading-relaxed text-anya-muted">
              Start talking to ANYA and your session transcript will appear here so you can replay
              any response.
            </p>
            <div className="mt-5 w-full">
              <AccessibleButton variant="primary" onClick={() => navigate('/conversation')}>
                Start Voice Conversation
              </AccessibleButton>
            </div>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Session messages">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className="anya-card rounded-2xl border border-anya-border bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      msg.role === 'user'
                        ? 'bg-anya-primary text-white'
                        : 'bg-anya-soft text-anya-primary'
                    }`}
                  >
                    {msg.role === 'user' ? 'You' : 'ANYA'}
                  </span>
                  <span className="text-[11px] text-anya-muted">{msg.timestamp}</span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-anya-ink">{msg.text}</p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {msg.intent ? (
                    <span className="text-[11px] font-semibold text-anya-muted">
                      Intent: {getIntentDisplayName(msg.intent)}
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => speak(msg.text, { force: true })}
                    aria-label={`Read ${msg.role === 'user' ? 'your message' : "ANYA's reply"} aloud`}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-anya-soft px-3 py-1.5 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Replay</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
