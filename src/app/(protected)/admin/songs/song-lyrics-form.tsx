"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/button";
import { FormField } from "@/components/form/field";
import { Body } from "@/components/typography";

export type SongLyricsFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type SongLyricsFormProps = {
  initialVersesText: string;
  action: (
    state: SongLyricsFormState,
    formData: FormData,
  ) => Promise<SongLyricsFormState>;
};

const INITIAL_STATE: SongLyricsFormState = {
  status: "idle",
  message: null,
};

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save lyrics"}
    </Button>
  );
};

const Message = ({ state }: { state: SongLyricsFormState }) => {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const color =
    state.status === "error"
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-600 dark:text-emerald-400";

  return <Body className={`text-sm ${color}`}>{state.message}</Body>;
};

const SongLyricsForm = ({ initialVersesText, action }: SongLyricsFormProps) => {
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormField
        label="Lyrics"
        htmlFor="verses"
        description="Separate verses with a blank line. Existing images stay connected for reconciled verses; new verses queue new illustration jobs."
      >
        <textarea
          id="verses"
          name="verses"
          rows={18}
          defaultValue={initialVersesText}
          required
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-100"
        />
      </FormField>

      <div className="flex items-center justify-between gap-4">
        <SubmitButton />
        <Message state={state} />
      </div>
    </form>
  );
};

export default SongLyricsForm;
