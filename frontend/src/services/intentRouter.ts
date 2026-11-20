import type { AssistantIntent, StructuredIntentResponse } from '../types/assistant';

export interface IntentActionDescriptor {
  label: string;
  route: string;
  state?: Record<string, unknown>;
}

const INTENT_LABELS: Record<AssistantIntent, string> = {
  general_conversation: 'Conversation',
  naira_detection: 'Naira Detection',
  object_recognition: 'Object Recognition',
  text_reading: 'Text Reading',
  send_message: 'Prepare Message',
  make_call: 'Prepare Call',
  banking_balance: 'Banking Demo',
  banking_transactions: 'Banking Demo',
  smartphone_guidance: 'Phone Guidance',
};

export function getIntentDisplayName(intent: AssistantIntent): string {
  return INTENT_LABELS[intent] ?? 'Assistant';
}

export function getIntentAction(
  result: StructuredIntentResponse
): IntentActionDescriptor | null {
  switch (result.intent) {
    case 'naira_detection':
      return { label: 'Open Naira Scanner', route: '/naira' };
    case 'object_recognition':
      return { label: 'Open Object Camera', route: '/objects' };
    case 'text_reading':
      return { label: 'Open Text Reader', route: '/read' };
    case 'send_message':
      return {
        label: 'Review & Prepare Message',
        route: '/communicate',
        state: {
          mode: 'message',
          channel: result.entities?.channel ?? 'whatsapp',
          recipient: result.entities?.recipient ?? '',
          messageBody: result.entities?.message_body ?? '',
        },
      };
    case 'make_call':
      return {
        label: 'Review & Prepare Call',
        route: '/communicate',
        state: {
          mode: 'call',
          recipient: result.entities?.recipient ?? '',
        },
      };
    case 'banking_balance':
      return { label: 'Open Banking Demo (Balance)', route: '/banking' };
    case 'banking_transactions':
      return { label: 'Open Banking Demo (Transactions)', route: '/banking' };
    default:
      return null;
  }
}

/**
 * Instant (<50ms) local intent matcher for core accessibility commands.
 * Eliminates cloud latency for navigation, camera, WhatsApp/SMS, calls, and simulated banking,
 * while letting Gemini handle open-ended conversation, Pidgin/Igbo/Yoruba nuance, and vision.
 */
export function tryInstantLocalIntent(
  spokenText: string,
  preferredLanguage = 'en-NG'
): StructuredIntentResponse | null {
  const text = spokenText.trim();
  const lower = text.toLowerCase();

  // 1. Naira / Money detection
  if (
    /\b(how much money|count (my )?(naira|money|cash)|naira|money dey my hand|money is in my hand|check (my )?money)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'naira_detection',
      language: preferredLanguage,
      requires_camera: true,
      requires_confirmation: false,
      reply: 'Opening Naira scanner now. Hold the notes steady in front of your camera.',
      suggested_route: '/naira',
    };
  }

  // 2. Text / Document / Screen reading
  if (
    /\b(read (this|the|my)?\s*(document|text|screen|receipt|label|sign|page|letter|paper)|read what'?s on my screen|read what is on my screen)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'text_reading',
      language: preferredLanguage,
      requires_camera: true,
      requires_confirmation: false,
      reply: 'Opening text reader now. Hold the document steady in front of your camera.',
      suggested_route: '/read',
    };
  }

  // 3. Camera / Object & Environment Recognition
  if (
    /\b(open (my )?camera|snap (a )?picture|take a (photo|picture)|what('?s| is) in front of me|describe (this |the )?(room|scene|place)|is there a chair|what colou?r|see around|wetin dey front)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'object_recognition',
      language: preferredLanguage,
      requires_camera: true,
      requires_confirmation: false,
      reply: 'Opening your camera to look around now.',
      suggested_route: '/objects',
    };
  }

  // 4. WhatsApp / SMS Messaging
  if (
    /\b(open whatsapp|whatsapp|send (a )?(message|text|sms)|text (my )?|send sms|message (my )?)\b/i.test(
      lower
    )
  ) {
    const isSms = /\bsms\b/i.test(lower) && !/\bwhatsapp\b/i.test(lower);
    const channel = isSms ? 'sms' : 'whatsapp';
    const recipientMatch = text.match(
      /\b(?:to|text|message|whatsapp)\s+(my\s+mother|mother|mum|mom|big\s+sis|my\s+sister|sister|ada|tunde|dr\.?\s*bello)\b/i
    );
    const recipient = recipientMatch ? recipientMatch[1] : '';

    return {
      intent: 'send_message',
      language: preferredLanguage,
      requires_camera: false,
      requires_confirmation: true,
      reply: isSms ? 'Opening SMS assistant now.' : 'Opening WhatsApp assistant now.',
      entities: {
        channel,
        ...(recipient ? { recipient } : {}),
      },
      suggested_route: '/communicate',
    };
  }

  // 5. Phone Calls
  if (/\b(call|phone call|dial|ring)\b/i.test(lower)) {
    const recipientMatch = text.match(
      /\b(?:call|dial|ring)\s+(my\s+mother|mother|mum|mom|big\s+sis|my\s+sister|sister|ada|tunde|dr\.?\s*bello|[a-z]+)\b/i
    );
    const recipient =
      recipientMatch && !/^(a|someone|my|the|phone)$/i.test(recipientMatch[1])
        ? recipientMatch[1]
        : '';

    return {
      intent: 'make_call',
      language: preferredLanguage,
      requires_camera: false,
      requires_confirmation: true,
      reply: recipient
        ? `Opening call assistant for ${recipient}.`
        : 'Opening phone call assistant now.',
      entities: recipient ? { recipient } : {},
      suggested_route: '/communicate',
    };
  }

  // 6. Simulated Banking Balance
  if (
    /\b(account balance|my balance|bank balance|how much is in my account|check (my )?balance)\b/i.test(
      lower
    )
  ) {
    return {
      intent: 'banking_balance',
      language: preferredLanguage,
      requires_camera: false,
      requires_confirmation: false,
      reply: 'This is your simulated demo bank account. Your available balance is ₦45,500.',
      suggested_route: '/banking',
    };
  }

  // 7. Simulated Banking Transactions
  if (/\b(recent transactions|bank history|my transactions|transaction history)\b/i.test(lower)) {
    return {
      intent: 'banking_transactions',
      language: preferredLanguage,
      requires_camera: false,
      requires_confirmation: false,
      reply:
        'In your simulated demo account, your recent transactions are a debit of ₦6,500 at Shoprite Lekki, a credit of ₦15,000 from Ada Okafor, and a debit of ₦2,000 for MTN Airtime.',
      suggested_route: '/banking',
    };
  }

  return null;
}
