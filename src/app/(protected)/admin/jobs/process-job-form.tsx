"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/button";
import { Body } from "@/components/typography";

export type DispatchState = {
  status: "idle" | "success" | "empty" | "error";
  message: string | null;
};

type ProcessJobFormProps = {
  action: (state: DispatchState, formData: FormData) => Promise<DispatchState>;
};

const INITIAL_STATE: DispatchState = {
  status: "idle",
  message: null,
};

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? "Processing…" : "Process next job"}
    </Button>
  );
};

const RepeatToggle = () => {
  const { pending } = useFormStatus();
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        name="repeat"
        disabled={pending}
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800"
      />
      <span>Process remaining jobs automatically</span>
    </label>
  );
};

const Message = ({ state }: { state: DispatchState }) => {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  let tone = "text-slate-600 dark:text-slate-300";
  if (state.status === "success") {
    tone = "text-emerald-600 dark:text-emerald-400";
  }
  if (state.status === "error") {
    tone = "text-rose-600 dark:text-rose-400";
  }

  return (
    <Body size="sm" className={`mt-2 ${tone}`}>
      {state.message}
    </Body>
  );
};

export const ProcessJobForm = ({ action }: ProcessJobFormProps) => {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "idle") {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-4">
        <SubmitButton />
        <RepeatToggle />
      </div>
      <Message state={state} />
    </form>
  );
};
