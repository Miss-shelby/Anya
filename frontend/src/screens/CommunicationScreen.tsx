import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  MessageSquare,
  Volume2,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Mic,
  Sparkles,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { AccessibleButton } from '../components/common/AccessibleButton';
import { SimulationBanner } from '../components/common/SimulationBanner';
import { useSpeech } from '../context/SpeechContext';
import { useSettings } from '../context/SettingsContext';
import { useAssistant } from '../context/AssistantContext';
import { getLanguageOption } from '../utils/languages';
import { listenOnceForVoiceReply } from '../services/wakeWordService';
import { playEarcon } from '../services/handsFreeService';

interface QuickContact {
  name: string;
  aliases: string[];
  relation: string;
  phone: string;
}

const DEMO_CONTACTS: QuickContact[] = [
  { name: 'Mum', aliases: ['mum', 'mom', 'mother', 'my mother', 'mama'], relation: 'Mother', phone: '+2348012345678' },
  { name: 'Big Sis', aliases: ['big sis', 'sister', 'my sister', 'ada'], relation: 'Sister', phone: '+2348023456789' },
  { name: 'Tunde', aliases: ['tunde', 'brother', 'brother tunde'], relation: 'Friend', phone: '+2348034567890' },
  { name: 'Dr. Bello', aliases: ['doctor', 'dr bello', 'bello', 'clinic'], relation: 'Clinic', phone: '+2348098765432' },
];

const PHONE_GUIDES = [
  {
    title: 'Find Wi-Fi Settings',
    steps:
      'Swipe down from the top of your screen with two fingers, tap the Settings gear icon, select Network and Internet or Wi-Fi, and double-tap the Wi-Fi switch.',
  },
  {
    title: 'Turn on TalkBack (Android)',
    steps:
      'Press and hold both volume keys for 3 seconds, or open Settings, go to Accessibility, select TalkBack, and switch it on.',
  },
];

type CommMode = 'message' | 'call';
type Channel = 'whatsapp' | 'sms';
type VoiceStep =
  | 'idle'
  | 'asking_recipient'
  | 'asking_message'
  | 'asking_confirm'
  | 'simulated_sent'
  | 'simulated_calling';

interface IncomingCommState {
  mode?: CommMode;
  channel?: Channel;
  recipient?: string;
  messageBody?: string;
  autoVoiceFlow?: boolean;
}

function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

function matchContact(spoken: string): QuickContact | undefined {
  const lower = spoken.toLowerCase();
  return DEMO_CONTACTS.find(
    (c) =>
      lower.includes(c.name.toLowerCase()) ||
      c.aliases.some((alias) => lower.includes(alias))
  );
}

/**
 * Parses combined phrases like: "Send Big Sis I am coming home"
 * into { recipient: "Big Sis", message: "I am coming home" }.
 */
function parseSpokenRecipientAndMessage(spoken: string): {
  recipient: string;
  message: string;
} {
  const cleaned = spoken
    .replace(/^(please\s+)?(send|text|message|tell|whatsapp)\s+(to\s+)?/i, '')
    .trim();

  const matched = matchContact(cleaned);
  if (matched) {
    const patterns = [matched.name, ...matched.aliases].sort((a, b) => b.length - a.length);
    for (const alias of patterns) {
      const idx = cleaned.toLowerCase().indexOf(alias.toLowerCase());
      if (idx !== -1) {
        const after = cleaned
          .slice(idx + alias.length)
          .replace(/^(\s*(that|saying|says|message|:|,)\s*)+/i, '')
          .trim();
        return { recipient: matched.name, message: after };
      }
    }
    return { recipient: matched.name, message: '' };
  }

  return { recipient: cleaned, message: '' };
}

export function CommunicationScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { speak, stopSpeaking } = useSpeech();
  const { settings } = useSettings();
  const { addMessage, setStatus } = useAssistant();

  const currentLang = getLanguageOption(settings.language);
  const autoFlowStartedRef = useRef(false);
  const activeRunIdRef = useRef(0);

  const [mode, setMode] = useState<CommMode>('message');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+2348012345678');
  const [messageBody, setMessageBody] = useState('');
  const [voiceStep, setVoiceStep] = useState<VoiceStep>('idle');
  const [agentPromptText, setAgentPromptText] = useState<string>('');
  const [liveHeard, setLiveHeard] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  // Live timer for simulated active call
  useEffect(() => {
    if (voiceStep !== 'simulated_calling') {
      setCallSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [voiceStep]);

  // Cancel any in-flight voice dialog on unmount
  useEffect(() => {
    return () => {
      activeRunIdRef.current += 1;
      stopSpeaking();
      setStatus('idle');
    };
  }, [stopSpeaking, setStatus]);

  const speakAndWait = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        setAgentPromptText(text);
        speak(text, { force: true, onEnd: () => resolve() });
      }),
    [speak]
  );

  const runVoiceAgentFlow = useCallback(
    async (initial: { mode: CommMode; recipient: string; messageBody: string }) => {
      const runId = ++activeRunIdRef.current;
      const isCancelled = () => activeRunIdRef.current !== runId;

      setStatus('listening');
      setStatusNotice(null);
      let activeRecipient = initial.recipient.trim();
      let activeMessage = initial.messageBody.trim();
      let activePhone = phoneNumber;

      if (activeRecipient) {
        const contact = matchContact(activeRecipient);
        if (contact) {
          activeRecipient = contact.name;
          activePhone = contact.phone;
          setRecipientName(contact.name);
          setPhoneNumber(contact.phone);
        } else {
          setRecipientName(activeRecipient);
        }
      }

      // STEP 1: Ask who to text / call if not yet provided
      if (!activeRecipient) {
        setVoiceStep('asking_recipient');
        const prompt =
          initial.mode === 'call'
            ? 'I have opened your phone assistant. Who would you like me to call?'
            : 'I have opened WhatsApp simulation. Who should we text? You can also say the message right away.';
        await speakAndWait(prompt);
        if (isCancelled()) return;

        await new Promise((r) => window.setTimeout(r, 350));
        if (isCancelled()) return;

        setLiveHeard('');
        playEarcon('start');
        const reply = await listenOnceForVoiceReply(
          currentLang.speechLang,
          12000,
          (interim) => setLiveHeard(interim)
        );
        if (isCancelled()) return;
        setLiveHeard('');

        if (!reply) {
          setVoiceStep('idle');
          setStatus('idle');
          await speakAndWait("I didn't hear a name. Say Anya whenever you're ready to try again.");
          return;
        }

        if (/cancel|stop|never mind/i.test(reply)) {
          setVoiceStep('idle');
          setStatus('idle');
          await speakAndWait('Cancelled. Returning home.');
          navigate('/home');
          return;
        }

        const parsed = parseSpokenRecipientAndMessage(reply);
        activeRecipient = parsed.recipient;
        if (parsed.message && initial.mode === 'message') {
          activeMessage = parsed.message;
          setMessageBody(activeMessage);
        }
        const matched = matchContact(activeRecipient);
        if (matched) {
          activeRecipient = matched.name;
          activePhone = matched.phone;
          setPhoneNumber(matched.phone);
        }
        setRecipientName(activeRecipient);
      }

      // STEP 2 (Messages only): Ask what message to send if not yet provided
      if (initial.mode === 'message' && !activeMessage) {
        setVoiceStep('asking_message');
        await speakAndWait(`Got it, ${activeRecipient}. What message should I send?`);
        if (isCancelled()) return;

        await new Promise((r) => window.setTimeout(r, 350));
        if (isCancelled()) return;

        setLiveHeard('');
        playEarcon('start');
        const reply = await listenOnceForVoiceReply(
          currentLang.speechLang,
          12000,
          (interim) => setLiveHeard(interim)
        );
        if (isCancelled()) return;
        setLiveHeard('');

        if (!reply || /cancel|stop|never mind/i.test(reply)) {
          setVoiceStep('idle');
          setStatus('idle');
          await speakAndWait('Message cancelled.');
          return;
        }

        activeMessage = reply;
        setMessageBody(activeMessage);
      }

      // STEP 3: Explicit read-back & voice confirmation
      setVoiceStep('asking_confirm');
      const confirmPrompt =
        initial.mode === 'call'
          ? `Ready to call ${activeRecipient}. Should I place the simulated call now? Say Yes to call, or Cancel.`
          : `Ready to send WhatsApp message to ${activeRecipient}: "${activeMessage}". Should I send it now? Say Yes to send, or Cancel.`;

      await speakAndWait(confirmPrompt);
      if (isCancelled()) return;

      await new Promise((r) => window.setTimeout(r, 350));
      if (isCancelled()) return;

      setLiveHeard('');
      playEarcon('start');
      const confirmReply = await listenOnceForVoiceReply(
        currentLang.speechLang,
        10000,
        (interim) => setLiveHeard(interim)
      );
      if (isCancelled()) return;
      setLiveHeard('');

      const isYes = /\b(yes|yeah|yep|send|call|confirm|go ahead|ok|okay|sure|do it)\b/i.test(
        confirmReply
      );

      if (!isYes) {
        setVoiceStep('idle');
        setStatus('idle');
        await speakAndWait('Okay, I did not send it. Say Anya anytime if you need something else.');
        return;
      }

      // STEP 4: Execute simulated action with clear spoken feedback
      if (initial.mode === 'call') {
        setVoiceStep('simulated_calling');
        const msg = `Calling ${activeRecipient} now in simulation mode.`;
        setStatusNotice(`Simulated Call Active: Calling ${activeRecipient} (${activePhone})`);
        addMessage('assistant', msg, { intent: 'make_call', language: settings.language });
        await speakAndWait(msg);
        setStatus('idle');
      } else {
        setVoiceStep('simulated_sent');
        const doneMsg = `Done! Your simulated WhatsApp message to ${activeRecipient} saying "${activeMessage}" has been sent.`;
        setStatusNotice(doneMsg);
        addMessage('assistant', doneMsg, { intent: 'send_message', language: settings.language });
        await speakAndWait(doneMsg);
        setStatus('idle');
      }
    },
    [addMessage, currentLang.speechLang, navigate, phoneNumber, setStatus, settings.language, speakAndWait]
  );

  // Handle incoming navigation from Voice Assistant (e.g., "Anya, send a WhatsApp message" or "Anya, call my mother")
  useEffect(() => {
    const state = location.state as IncomingCommState | null;
    if (!state) return;

    const incomingMode: CommMode = state.mode ?? 'message';
    setMode(incomingMode);
    if (state.channel) setChannel(state.channel);

    let resolvedName = state.recipient ?? '';
    if (resolvedName) {
      const match = matchContact(resolvedName);
      if (match) {
        resolvedName = match.name;
        setPhoneNumber(match.phone);
      }
      setRecipientName(resolvedName);
    }

    if (state.messageBody) {
      setMessageBody(state.messageBody);
    }

    if (state.autoVoiceFlow && !autoFlowStartedRef.current) {
      autoFlowStartedRef.current = true;
      // Wait 550ms so Home screen's wake-word recognizer fully releases the microphone
      window.setTimeout(() => {
        void runVoiceAgentFlow({
          mode: incomingMode,
          recipient: resolvedName,
          messageBody: state.messageBody ?? '',
        });
      }, 550);
    }
  }, [location.state, runVoiceAgentFlow]);

  const handleOpenRealApp = () => {
    stopSpeaking();
    if (mode === 'call') {
      window.open(`tel:${phoneNumber.trim()}`, '_self');
      setStatusNotice(`Opened your device phone dialer for ${recipientName || phoneNumber}.`);
      return;
    }
    if (channel === 'whatsapp') {
      const waNum = sanitizePhoneForWhatsApp(phoneNumber);
      window.open(
        `https://wa.me/${waNum}?text=${encodeURIComponent(messageBody.trim())}`,
        '_blank',
        'noopener,noreferrer'
      );
      setStatusNotice(`Opened real WhatsApp with your drafted message for ${recipientName}.`);
    } else {
      window.open(
        `sms:${phoneNumber.trim()}?body=${encodeURIComponent(messageBody.trim())}`,
        '_self'
      );
      setStatusNotice(`Opened real SMS app with your drafted message for ${recipientName}.`);
    }
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title="Communication" showBack backTo="/home" />

      <main className="anya-scroll flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-2">
        <SimulationBanner
          title="Voice Agent Simulation Mode"
          message="Step-by-step hands-free WhatsApp & Calling is simulated for this web demo. You can also launch your real WhatsApp or Phone dialer below."
        />

        {/* Active Step-by-Step Voice Agent Status Card */}
        {voiceStep !== 'idle' && (
          <section
            role="status"
            aria-live="polite"
            className={`anya-card space-y-3 rounded-3xl border-2 p-4 shadow-card ${
              voiceStep === 'simulated_calling'
                ? 'border-anya-success bg-emerald-50'
                : voiceStep === 'simulated_sent'
                  ? 'border-anya-success bg-white'
                  : 'border-anya-primary bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-anya-soft px-3 py-1 text-xs font-bold text-anya-primary">
                {voiceStep === 'simulated_calling' ? (
                  <>
                    <Phone className="h-3.5 w-3.5 text-anya-success" aria-hidden="true" />
                    <span className="text-anya-success">
                      Calling {recipientName} · {formatTimer(callSeconds)} (Simulated)
                    </span>
                  </>
                ) : voiceStep === 'simulated_sent' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-anya-success" aria-hidden="true" />
                    <span className="text-anya-success">Sent (Simulated)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>ANYA Voice Agent Listening…</span>
                  </>
                )}
              </span>
            </div>

            {agentPromptText && (
              <p className="text-sm font-semibold leading-relaxed text-anya-ink">
                &ldquo;{agentPromptText}&rdquo;
              </p>
            )}

            {liveHeard && (
              <p className="rounded-full bg-anya-bg px-3 py-1 text-xs font-semibold text-anya-primary">
                Hearing: &ldquo;{liveHeard}&rdquo;
              </p>
            )}

            {voiceStep === 'simulated_calling' && (
              <AccessibleButton
                variant="danger"
                icon={<PhoneOff className="h-4 w-4" />}
                onClick={() => {
                  activeRunIdRef.current += 1;
                  setVoiceStep('idle');
                  speak(`Ended simulated call with ${recipientName}.`, { force: true });
                }}
              >
                End Simulated Call
              </AccessibleButton>
            )}

            {(voiceStep === 'simulated_sent' || voiceStep === 'simulated_calling') && (
              <AccessibleButton
                variant="secondary"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={handleOpenRealApp}
              >
                {mode === 'call' ? 'Also Open Real Phone Dialer' : 'Also Open Real WhatsApp'}
              </AccessibleButton>
            )}
          </section>
        )}

        {/* Mode switcher */}
        <div
          role="tablist"
          aria-label="Communication mode"
          className="grid grid-cols-2 gap-2 rounded-full bg-white p-1.5 shadow-card"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'message'}
            onClick={() => {
              setMode('message');
              setVoiceStep('idle');
            }}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full text-xs font-bold transition-colors ${
              mode === 'message'
                ? 'bg-anya-primary text-white'
                : 'text-anya-muted hover:text-anya-ink'
            }`}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>WhatsApp / SMS</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'call'}
            onClick={() => {
              setMode('call');
              setVoiceStep('idle');
            }}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full text-xs font-bold transition-colors ${
              mode === 'call'
                ? 'bg-anya-primary text-white'
                : 'text-anya-muted hover:text-anya-ink'
            }`}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span>Phone Call</span>
          </button>
        </div>

        {/* Start Interactive Voice Agent Button */}
        <AccessibleButton
          variant="primary"
          icon={<Mic className="h-5 w-5" />}
          onClick={() =>
            void runVoiceAgentFlow({
              mode,
              recipient: '',
              messageBody: '',
            })
          }
        >
          {mode === 'call' ? 'Start Voice-Guided Call' : 'Start Voice-Guided WhatsApp'}
        </AccessibleButton>

        {/* Quick Contacts */}
        <section aria-labelledby="quick-contacts-heading">
          <h2
            id="quick-contacts-heading"
            className="mb-2 text-xs font-bold uppercase tracking-wide text-anya-muted"
          >
            Quick Contacts (Demo)
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CONTACTS.map((contact) => {
              const selected = recipientName === contact.name;
              return (
                <button
                  key={contact.name}
                  type="button"
                  onClick={() => {
                    setRecipientName(contact.name);
                    setPhoneNumber(contact.phone);
                    speak(`Selected ${contact.name}.`);
                  }}
                  className={`anya-card flex min-h-[58px] flex-col items-start justify-center rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-card ${
                    selected
                      ? 'border-2 border-anya-primary'
                      : 'border border-anya-border hover:border-anya-primaryLight'
                  }`}
                >
                  <span className="text-sm font-bold text-anya-ink">{contact.name}</span>
                  <span className="text-[11px] text-anya-muted">{contact.relation}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Manual / Review Form */}
        <section className="anya-card space-y-3 rounded-3xl border border-anya-border bg-white p-4 shadow-card">
          <div>
            <label htmlFor="comm-recipient" className="block text-xs font-bold text-anya-muted">
              Recipient
            </label>
            <input
              id="comm-recipient"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Mum or Big Sis"
              className="mt-1 min-h-[46px] w-full rounded-2xl border border-anya-border bg-anya-bg px-3.5 text-sm font-semibold text-anya-ink focus:border-anya-primary focus:bg-white"
            />
          </div>

          {mode === 'message' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`min-h-[42px] rounded-full text-xs font-bold ${
                    channel === 'whatsapp'
                      ? 'bg-anya-primary text-white'
                      : 'bg-anya-soft text-anya-ink'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`min-h-[42px] rounded-full text-xs font-bold ${
                    channel === 'sms' ? 'bg-anya-primary text-white' : 'bg-anya-soft text-anya-ink'
                  }`}
                >
                  SMS Text
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="comm-message" className="block text-xs font-bold text-anya-muted">
                    Message
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      speak(
                        messageBody.trim()
                          ? `Message to ${recipientName || 'recipient'}: ${messageBody}`
                          : 'Your message is empty.',
                        { force: true }
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-anya-soft px-2.5 py-1 text-[11px] font-bold text-anya-primary"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Read Aloud</span>
                  </button>
                </div>
                <textarea
                  id="comm-message"
                  rows={2}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Message text…"
                  className="mt-1.5 w-full rounded-2xl border border-anya-border bg-anya-bg p-3 text-sm text-anya-ink focus:border-anya-primary focus:bg-white"
                />
              </div>
            </>
          )}

          <AccessibleButton
            variant="primary"
            onClick={() =>
              void runVoiceAgentFlow({
                mode,
                recipient: recipientName,
                messageBody,
              })
            }
          >
            {mode === 'call'
              ? `Confirm & Call ${recipientName || 'Contact'} (Simulated)`
              : `Confirm & Send ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} (Simulated)`}
          </AccessibleButton>

          {statusNotice && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-anya-success"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{statusNotice}</span>
            </div>
          )}
        </section>

        {/* Guided Smartphone Navigation */}
        <section aria-labelledby="phone-guides-heading" className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
            <Smartphone className="h-4 w-4 text-anya-primary" aria-hidden="true" />
            <h2 id="phone-guides-heading">Guided Phone Navigation</h2>
          </div>

          {PHONE_GUIDES.map((guide) => (
            <div
              key={guide.title}
              className="anya-card rounded-2xl border border-anya-border bg-white p-3.5 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-anya-ink">{guide.title}</p>
                <button
                  type="button"
                  onClick={() => speak(`${guide.title}. ${guide.steps}`, { force: true })}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-anya-soft px-3 py-1 text-xs font-bold text-anya-primary"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Guide Me</span>
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-anya-muted">{guide.steps}</p>
            </div>
          ))}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
