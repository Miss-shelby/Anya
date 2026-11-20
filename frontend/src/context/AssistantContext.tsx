import React, { createContext, useCallback, useContext, useState } from 'react';
import type { AssistantIntent, AssistantStatus, ConversationMessage } from '../types/assistant';

interface AssistantContextValue {
  status: AssistantStatus;
  setStatus: (status: AssistantStatus) => void;
  messages: ConversationMessage[];
  addMessage: (
    role: 'user' | 'assistant',
    text: string,
    meta?: { intent?: AssistantIntent; language?: string }
  ) => ConversationMessage;
  clearHistory: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const addMessage = useCallback(
    (
      role: 'user' | 'assistant',
      text: string,
      meta?: { intent?: AssistantIntent; language?: string }
    ) => {
      const msg: ConversationMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: meta?.intent,
        language: meta?.language,
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    []
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        status,
        setStatus,
        messages,
        addMessage,
        clearHistory,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return ctx;
}
