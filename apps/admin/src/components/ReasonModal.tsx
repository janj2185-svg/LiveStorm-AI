"use client";

import { useState, type FormEvent } from "react";

import { Button } from "./Button";
import { describeError } from "./DataState";
import { Field, TextArea } from "./Field";
import { Modal, modalStyles } from "./Modal";

export function ReasonModal({
  title,
  description,
  confirmLabel,
  confirmVariant = "gold",
  minLength = 5,
  maxLength = 1000,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: "gold" | "danger" | "ghost";
  minLength?: number;
  maxLength?: number;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(describeError(err).detail);
      setSubmitting(false);
    }
  };

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Reason" hint={`${minLength}–${maxLength} characters, recorded in the audit log.`}>
          <TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={minLength}
            maxLength={maxLength}
            required
            autoFocus
            rows={3}
          />
        </Field>
        {error ? <p className={modalStyles.errorText}>{error}</p> : null}
        <div className={modalStyles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={confirmVariant}
            disabled={submitting || reason.trim().length < minLength}
          >
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
