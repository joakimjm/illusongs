import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";
import { Button } from "@/components/button";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading } from "@/components/typography";
import { APP_NAME } from "@/config/app";
import {
  fetchSongGenerationJobList,
  resetSongGenerationJob,
} from "@/features/songs/song-generation-queue";
import {
  processNextSongGenerationJob,
  type SongGenerationRunResult,
} from "@/features/songs/song-generation-runner";
import { deleteVerseIllustrationImage } from "@/features/songs/verse-illustration-storage";
import { type DispatchState, ProcessJobForm } from "./process-job-form";

const JOBS_PATH: Route = "/admin/jobs";
const MAX_CHAINED_JOBS = 10;

const processNextJobAction = async (
  _prevState: {
    status: "idle" | "success" | "empty" | "error";
    message: string | null;
  },
  formData: FormData,
) => {
  "use server";

  try {
    const shouldRepeat = formData.get("repeat") === "on";
    const processed: SongGenerationRunResult[] = [];
    let queueExhausted = false;

    while (true) {
      const result = await processNextSongGenerationJob();
      if (!result) {
        queueExhausted = shouldRepeat && processed.length > 0;
        break;
      }

      processed.push(result);
      revalidatePath(JOBS_PATH);

      if (!shouldRepeat || processed.length >= MAX_CHAINED_JOBS) {
        break;
      }
    }

    if (processed.length === 0) {
      revalidatePath(JOBS_PATH);
      return { status: "empty", message: "No pending jobs." } as DispatchState;
    }

    const count = processed.length;
    const last = processed[count - 1];
    const tail =
      shouldRepeat && queueExhausted
        ? " Queue is empty."
        : shouldRepeat && count >= MAX_CHAINED_JOBS
          ? " Stopped after batch limit."
          : "";

    const message =
      shouldRepeat && count > 1
        ? `Processed ${count} jobs. Last verse ${last.verseSequence}.${tail}`
        : `Generated illustration for verse ${last.verseSequence}.`;

    return {
      status: "success",
      message,
    } as DispatchState;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return {
      status: "error",
      message: `Failed to process job: ${message}`,
    } as DispatchState;
  }
};

const resetJobAction = async (formData: FormData) => {
  "use server";

  const jobId = formData.get("jobId");
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    return;
  }

  const result = await resetSongGenerationJob(jobId);
  if (!result) {
    return;
  }

  const deletePromises: Array<Promise<void>> = [];
  if (result.imagePath) {
    deletePromises.push(deleteVerseIllustrationImage(result.imagePath));
  }
  if (result.thumbnailPath) {
    deletePromises.push(deleteVerseIllustrationImage(result.thumbnailPath));
  }

  await Promise.allSettled(deletePromises).then((settled) => {
    settled.forEach((outcome) => {
      if (outcome.status === "rejected") {
        const error = outcome.reason;
        console.error(
          JSON.stringify({
            event: "song_generation_image_delete_failed",
            jobId,
            imagePath: result.imagePath,
            thumbnailPath: result.thumbnailPath,
            error:
              error instanceof Error
                ? error.message
                : String(error ?? "unknown"),
          }),
        );
      }
    });
  });
  revalidatePath(JOBS_PATH);
};

const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const truncate = (value: string, length: number = 100): string =>
  value.length <= length ? value : `${value.slice(0, length)}…`;

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100",
  in_progress: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-100",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-100",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100",
};

const buildConversationUrl = (conversationId: string): string =>
  `https://openrouter.ai/conversation/${conversationId}`;

const AdminJobsPage = async () => {
  const jobs = await fetchSongGenerationJobList(100);

  return (
    <PageShell>
      <HeroHeader
        eyebrow={APP_NAME}
        title="Illustration queue"
        description="Each verse generates an illustration job. Keep an eye on the queue and retry if something fails."
      />

      <Panel>
        <Heading level={2} className="text-base">
          Recent jobs
        </Heading>
        <Body size="sm" className="text-slate-600 dark:text-slate-300">
          Jobs are ordered by status and most recent updates. Use the actions
          below to keep things moving.
        </Body>
        <div className="mt-4">
          <ProcessJobForm action={processNextJobAction} />
        </div>

        <div className="mt-6 -mx-4 overflow-x-auto sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
              <table className="min-w-5xl table-fixed divide-y divide-slate-200/70 text-sm dark:divide-slate-800/60">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Song</th>
                    <th className="px-4 py-3">Verse</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Last error</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
                  {jobs.map((job) => {
                    const badge =
                      STATUS_STYLES[job.status] ??
                      "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200";
                    const canReset = job.status !== "pending";
                    const conversationId = job.conversationId?.trim() ?? null;
                    const conversationUrl = conversationId
                      ? buildConversationUrl(conversationId)
                      : null;

                    return (
                      <tr
                        key={job.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          <div className="whitespace-nowrap">
                            {job.songTitle}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            /{job.songSlug}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div className="font-medium">
                            Verse {job.verseSequence}
                          </div>
                          <div className="whitespace-pre text-xs text-slate-500 dark:text-slate-400">
                            {truncate(job.verseLyric, 120)}
                          </div>
                          {job.status === "completed" &&
                          job.verseIllustrationUrl ? (
                            <a
                              href={job.verseIllustrationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-xs font-medium text-sky-600 underline decoration-sky-400 underline-offset-2 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              View illustration
                              <HiArrowTopRightOnSquare className="ml-1 mt-0.5" />
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}
                          >
                            {job.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {job.attempts}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatTimestamp(job.updatedAt ?? job.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                          {job.lastError ? truncate(job.lastError, 90) : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-end gap-2">
                            <form
                              action={resetJobAction}
                              className="inline-flex"
                            >
                              <input
                                type="hidden"
                                name="jobId"
                                value={job.id}
                              />
                              {canReset && (
                                <Button
                                  type="submit"
                                  variant="danger"
                                  size="xs"
                                >
                                  Requeue
                                </Button>
                              )}
                            </form>
                            {conversationUrl ? (
                              <a
                                href={conversationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex whitespace-nowrap items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
                              >
                                Open conversation
                                <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Body
                          size="sm"
                          className="text-slate-500 dark:text-slate-400"
                        >
                          The queue is empty. Draft a song to enqueue new jobs.
                        </Body>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
};

export default AdminJobsPage;
