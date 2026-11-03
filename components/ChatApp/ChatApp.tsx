"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { AnswerCards } from "@/components/Cards/AnswerCards";
import { ChatShell } from "@/components/ChatShell/ChatShell";
import { Composer } from "@/components/Composer/Composer";
import { ErrorAlert } from "@/components/ErrorAlert/ErrorAlert";
import { Header } from "@/components/Header/Header";
import { LanguageToggle } from "@/components/LanguageToggle/LanguageToggle";
import { Greeting } from "@/components/MessageBubble/Greeting";
import { MessageBubble } from "@/components/MessageBubble/MessageBubble";
import { TypingIndicator } from "@/components/MessageBubble/TypingIndicator";
import { TraceAside } from "@/components/TraceAside/TraceAside";
import { TraceSheet } from "@/components/TraceSheet/TraceSheet";
import { sendTurn, type TurnInput } from "@/lib/chat/client";
import { latestTrace } from "@/lib/chat/latestTrace";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { renderReply } from "@/lib/markdown/renderReply";
import { historyStore } from "@/lib/storage/historyStore";

import styles from "./ChatApp.module.css";
import { NewConversationButton } from "./NewConversationButton";

export function ChatApp() {
  const { locale, t } = useI18n();
  const history = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const turn = useMutation({
    mutationFn: sendTurn,
    onSuccess: ({ reply, cards, trace }, input: TurnInput) =>
      historyStore.save([
        ...input.history,
        { role: "user", text: input.text },
        { role: "agent", text: reply, cards, trace },
      ]),
    onError: (_error, input) => setDraft((current) => current || input.text),
  });

  const trace = latestTrace(history);
  const pendingText = turn.isPending ? turn.variables.text : undefined;

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [history, pendingText, turn.error]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || turn.isPending) return;
    setDraft("");
    turn.mutate({ history, text: trimmed, locale });
  }

  function startOver() {
    historyStore.clear();
    turn.reset();
    setDraft("");
    composerRef.current?.focus();
  }

  return (
    <>
      <Header
        actions={
          <div className={styles.actions}>
            <LanguageToggle />
            <NewConversationButton onClick={startOver} />
            <TraceSheet entry={trace} />
          </div>
        }
      />
      <ChatShell
        feedLabel={t("feed.label")}
        aside={<TraceAside entry={trace} />}
        alert={turn.error && <ErrorAlert error={turn.error} />}
        composer={
          <Composer
            ref={composerRef}
            value={draft}
            onChange={setDraft}
            onSubmit={() => send(draft)}
          />
        }
      >
        <Greeting showSuggestions={history.length === 0 && !turn.isPending} onPick={send} />
        {history.map((message, index) => (
          <MessageBubble
            key={index}
            role={message.role}
            footer={message.cards && <AnswerCards cards={message.cards} />}
          >
            {message.role === "agent" ? renderReply(message.text) : message.text}
          </MessageBubble>
        ))}
        {pendingText !== undefined && (
          <>
            <MessageBubble role="user">{pendingText}</MessageBubble>
            <TypingIndicator />
          </>
        )}
        <div ref={feedEndRef} />
      </ChatShell>
    </>
  );
}
