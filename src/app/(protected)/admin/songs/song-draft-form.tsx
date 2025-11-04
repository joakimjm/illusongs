"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/button";
import { Body } from "@/components/typography";

export type SongDraftFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type SongDraftFormProps = {
  action: (
    state: SongDraftFormState,
    formData: FormData,
  ) => Promise<SongDraftFormState>;
};

const INITIAL_STATE: SongDraftFormState = {
  status: "idle",
  message: null,
};

const SubmitButton = ({ children }: { children: React.ReactNode }) => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
};

const Message = ({ state }: { state: SongDraftFormState }) => {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const color =
    state.status === "error"
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-600 dark:text-emerald-400";
  return <Body className={`text-sm ${color}`}>{state.message}</Body>;
};

const SongDraftForm = ({ action }: SongDraftFormProps) => {
  const [state, formAction] = useFormState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="title"
          className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
        >
          Song title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
          placeholder="Enter a working title"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="verses"
          className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
        >
          Verses
        </label>
        <textarea
          id="verses"
          name="verses"
          rows={8}
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
          placeholder={`Verse one\nAnother line\n\nVerse two`}
        />
        <Body size="xs" className="text-slate-500 dark:text-slate-400">
          Separate verses with a blank line. Each verse will queue an
          illustration job.
        </Body>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="tags"
          className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
        >
          Tags (optional)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="dreamy, lullaby, forest"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
        />
        <Body size="xs" className="text-slate-500 dark:text-slate-400">
          Comma separated. Tags are stored in lowercase.
        </Body>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SubmitButton>Create song draft</SubmitButton>
        <Message state={state} />
      </div>
    </form>
  );
};

export default SongDraftForm;
