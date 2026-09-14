import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, Trash2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import {
  deleteContactMessage,
  listContactMessages,
  updateContactMessage,
} from "@/lib/contact.functions";
import type { ContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Removal Work" },
      { name: "description", content: "Contact form submissions sent from your website." },
      { property: "og:title", content: "Messages — Removal Work" },
      { property: "og:description", content: "Contact form submissions sent from your website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

const STATUSES = ["new", "read", "replied", "archived"] as const;

function MessageCard({
  item,
  busy,
  onStatus,
  onNote,
  onDelete,
}: {
  item: ContactMessage;
  busy: boolean;
  onStatus: (status: string) => void;
  onNote: (note: string) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState(item.handledNote);
  return (
    <article className="surface app-card animate-rise">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-ink">{item.subject}</p>
          <p className="text-sm text-muted-foreground">
            {item.name} ·{" "}
            <a href={`mailto:${item.email}`} className="text-primary hover:underline">
              {item.email}
            </a>{" "}
            · {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          Email {item.emailStatus}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor={`status-${item.id}`}>
          Status
        </label>
        <select
          id={`status-${item.id}`}
          className="app-select"
          value={item.status}
          disabled={busy}
          onChange={(event) => onStatus(event.target.value)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <a
          href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Mail className="size-3.5" /> Reply
        </a>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          className="ml-auto text-danger hover:text-danger"
          onClick={() => {
            if (window.confirm("Delete this message?")) onDelete();
          }}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <textarea
          className="app-input min-w-0 flex-1 resize-y"
          rows={2}
          maxLength={500}
          value={note}
          placeholder="Your internal note"
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onNote(note)}>
          Save note
        </Button>
      </div>
    </article>
  );
}

function MessagesPage() {
  const fetchMessages = useServerFn(listContactMessages);
  const update = useServerFn(updateContactMessage);
  const remove = useServerFn(deleteContactMessage);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => fetchMessages({ data: undefined }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
  };

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status?: (typeof STATUSES)[number]; note?: string }) =>
      update({ data: input }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
  });

  const busy = updateMutation.isPending || deleteMutation.isPending;
  const messages = data ?? [];

  return (
    <AppShell title="Messages" description="Contact form submissions from your website, newest first.">
      {isPending ? (
        <EmptyState title="Loading messages…" body="One moment." />
      ) : error ? (
        <EmptyState
          title="We couldn't load your messages"
          body="Only admin accounts can read contact submissions. Please refresh and try again."
        />
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          body="Anything sent through the contact form on your website will appear here."
        />
      ) : (
        <div className="app-list-grid">
          {messages.map((item) => (
            <MessageCard
              key={item.id}
              item={item}
              busy={busy}
              onStatus={(status) =>
                updateMutation.mutate({ id: item.id, status: status as (typeof STATUSES)[number] })
              }
              onNote={(note) => updateMutation.mutate({ id: item.id, note })}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
