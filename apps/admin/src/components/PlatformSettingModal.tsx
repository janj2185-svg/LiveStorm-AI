"use client";

import { useState, type FormEvent } from "react";

import type { PlatformSetting } from "@/lib/types";

import { Button } from "./Button";
import { describeError } from "./DataState";
import { Field, TextArea, TextInput } from "./Field";
import { Modal, modalStyles } from "./Modal";

export function PlatformSettingModal({
  existing,
  onSubmit,
  onClose,
}: {
  existing?: PlatformSetting;
  onSubmit: (payload: {
    key: string;
    expected_version: number | null;
    value: Record<string, unknown>;
    secret: boolean;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [key, setKey] = useState(existing?.key ?? "");
  const [secret, setSecret] = useState(existing?.secret ?? false);
  const [valueText, setValueText] = useState(
    existing && !existing.secret ? JSON.stringify(existing.value ?? {}, null, 2) : "{}",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(valueText);
      } catch {
        throw new Error("Value must be valid JSON, e.g. {\"enabled\": true}.");
      }
      await onSubmit({
        key: key.trim().toLowerCase(),
        expected_version: existing?.version ?? null,
        value: parsed,
        secret,
      });
      onClose();
    } catch (err) {
      setError(describeError(err).detail);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={existing ? `Edit ${existing.key}` : "Create platform setting"}
      description="Value must be a JSON object. Secret values are encrypted at rest and never echoed back."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {!existing ? (
          <Field label="Key" hint="Lowercase, letters/digits/._- separators, 2–96 characters.">
            <TextInput
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="e.g. support_contact"
              required
              pattern="^[a-z][a-z0-9]*(?:[._\-][a-z0-9]+)*$"
            />
          </Field>
        ) : null}

        <Field label="Secret" hint="Secrets are encrypted server-side and their value is never returned by the API.">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={secret} onChange={(event) => setSecret(event.target.checked)} />
            <span>Store as secret</span>
          </label>
        </Field>

        <Field label="Value (JSON)">
          <TextArea
            value={valueText}
            onChange={(event) => setValueText(event.target.value)}
            rows={6}
            required
          />
        </Field>

        {error ? <p className={modalStyles.errorText}>{error}</p> : null}
        <div className={modalStyles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={submitting}>
            {submitting ? "Saving…" : existing ? "Save changes" : "Create setting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
