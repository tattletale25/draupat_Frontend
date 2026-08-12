import { useSyncExternalStore } from 'react';
import type { ChatMessage } from '../components/dashboard/ask-away/ChatMessageBubble';

/** Ask Away's thread, held outside AskAwayPage's component state. The
 * hash router (see router/useHashRoute.ts) only keeps the active route's
 * component mounted, so switching to another tab and back would otherwise
 * reset useState-held history to empty — this survives that. */

let messages: ChatMessage[] = [];
let sending = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChatMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribe, () => messages);
}

export function useChatSending(): boolean {
  return useSyncExternalStore(subscribe, () => sending);
}

export function appendChatMessages(next: ChatMessage[]) {
  messages = [...messages, ...next];
  notify();
}

export function updateChatMessage(id: string, patch: Partial<ChatMessage>) {
  messages = messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
  notify();
}

export function setChatSending(next: boolean) {
  sending = next;
  notify();
}
