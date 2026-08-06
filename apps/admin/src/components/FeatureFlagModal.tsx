"use client";

import { useState, type FormEvent } from "react";

import type { FeatureFlag, FlagEnvironment } from "@/lib/types";

import { Button } from "./Button";
import { describeError } from "./DataState";
import { Field, TextArea, TextInput } from "./Field";
import { Modal, modalStyles } from "./Modal";

const ALL_ENVIRONMENTS: FlagEnvironment[] = ["development", "test", "staging", "production"];

export interface FeatureFlagFormPayload {
  key: string;
  environments: FlagEnvironment[];
  enabled: boolean;
  rollout_bps: number;
  allow_subjects: string[];
  deny_subjects: string[];
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function FeatureFlagModal({
  existing,
  onSubmit,
  onClose,
}: {
  existing?: FeatureFlag;
  onSubmit: (payload: FeatureFlagFormPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [key, setKey] = useState(existing?.key ?? "");
  const [environments, setEnvironments] = useState<FlagEnvironment[]>(
    existing?.environments ?? ["production"],
  );
  const [enabled, setEnabled] = useState(existing?.enabled ?? false);
  const [rolloutBps, setRolloutBps] = useState(existing?.rollout_bps ?? 0);
  const [allowSubjects, setAllowSubjects] = useState(existing?.allow_subjects.join(", ") ?? "");
  const [denySubjects, setDenySubjects] = useState(existing?.deny_subjects.join(", ") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEnvironment = (env: FlagEnvironment) => {
    setEnvironments((current) =>
      current.includes(env) ? current.filter((item) => item !== env) : [...current, env],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        key: key.trim().toLowerCase(),
        environments,
        enabled,
        rollout_bps: rolloutBps,
        allow_subjects: toList(allowSubjects),
        deny_subjects: toList(denySubjects),
      });
      onClose();
    } catch (err) {
      setError(describeError(err).detail);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={existing ? `Edit ${existing.key}` : "Create feature flag"}
      description="Rollout percentage is in basis points (0–10,000 = 0–100%)."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {!existing ? (
          <Field label="Key" hint="Lowercase, letters/digits/._- separators, 2–96 characters.">
            <TextInput
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="e.g. new_gift_studio"
              required
              pattern="^[a-z][a-z0-9]*(?:[._\-][a-z0-9]+)*$"
            />
          </Field>
        ) : null}

        <Field label="Environments">
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {ALL_ENVIRONMENTS.map((env) => (
              <label key={env} className={modalStyles.description} style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={environments.includes(env)}
                  onChange={() => toggleEnvironment(env)}
                  style={{ marginRight: "0.35rem" }}
                />
                {env}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Enabled">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            <span>Flag is enabled for rollout evaluation</span>
          </label>
        </Field>

        <Field label="Rollout (basis points)" hint="0 = off for everyone, 10000 = on for everyone.">
          <TextInput
            type="number"
            min={0}
            max={10000}
            value={rolloutBps}
            onChange={(event) => setRolloutBps(Number(event.target.value))}
          />
        </Field>

        <Field label="Allow subjects" hint="Comma-separated subject IDs always enabled.">
          <TextArea
            value={allowSubjects}
            onChange={(event) => setAllowSubjects(event.target.value)}
            rows={2}
          />
        </Field>

        <Field label="Deny subjects" hint="Comma-separated subject IDs always disabled.">
          <TextArea
            value={denySubjects}
            onChange={(event) => setDenySubjects(event.target.value)}
            rows={2}
          />
        </Field>

        {error ? <p className={modalStyles.errorText}>{error}</p> : null}
        <div className={modalStyles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={submitting}>
            {submitting ? "Saving…" : existing ? "Save changes" : "Create flag"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
