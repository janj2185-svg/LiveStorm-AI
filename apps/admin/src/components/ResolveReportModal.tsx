"use client";

import { useState, type FormEvent } from "react";

import { Button } from "./Button";
import { describeError } from "./DataState";
import { Field, Select, TextArea } from "./Field";
import { Modal, modalStyles } from "./Modal";

type Decision = "resolved" | "dismissed";
type Action = "none" | "warn" | "hide_content" | "suspend_user" | "remove_content";

export function ResolveReportModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (payload: { status: Decision; action: Action; notes?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Decision>("resolved");
  const [action, setAction] = useState<Action>("none");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ status, action, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError(describeError(err).detail);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Resolve report"
      description="Record a moderation decision. This is written to the trust & safety audit trail."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <Field label="Decision">
          <Select value={status} onChange={(event) => setStatus(event.target.value as Decision)}>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </Select>
        </Field>
        <Field label="Action taken">
          <Select value={action} onChange={(event) => setAction(event.target.value as Action)}>
            <option value="none">None</option>
            <option value="warn">Warn</option>
            <option value="hide_content">Hide content</option>
            <option value="suspend_user">Suspend user</option>
            <option value="remove_content">Remove content</option>
          </Select>
        </Field>
        <Field label="Notes" hint="Optional, up to 5000 characters.">
          <TextArea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={5000}
            rows={3}
          />
        </Field>
        {error ? <p className={modalStyles.errorText}>{error}</p> : null}
        <div className={modalStyles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={submitting}>
            {submitting ? "Saving…" : "Save decision"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
