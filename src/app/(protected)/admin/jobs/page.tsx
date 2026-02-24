import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";
import { Badge, type BadgeVariant } from "@/components/badge";
import { Button } from "@/components/button";
import { FormField } from "@/components/form/field";
import { HeroHeader } from "@/components/hero-header";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { Body, Heading } from "@/components/typography";
import { fetchSongGenerationJobList } from "@/features/songs/song-generation-queue";
import {
  processNextSongGenerationJob,
  type SongGenerationRunResult,
} from "@/features/songs/song-generation-runner";
import { type DispatchState, ProcessJobForm } from "./process-job-form";
import { RequeueJobControls } from "./requeue-job-controls";

const JOBS_PATH: Route = "/admin/jobs";
const MAX_CHAINED_JOBS = 10;
const DEFAULT_JOB_LIMIT = 100;

type AdminJobsPageProps = {
  readonly searchParams?: Record<string, string | string[] | undefined>;
};

const parseBooleanParam = (
  value: string | string[] | undefined,
  defaultValue: boolean = false,
): boolean => {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) {
    return defaultValue;
  }
  const normalized = resolved.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const parseSearchParam = (value: string | string[] | undefined): string => {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved?.trim() ?? "";
};

type JobSort =
  | "queue"
  | "updated_desc"
  | "updated_asc"
  | "song_title_asc"
  | "song_title_desc"
  | "status";

const isJobSort = (value: string): value is JobSort => {
  switch (value) {
    case "queue":
    case "updated_desc":
    case "updated_asc":
    case "song_title_asc":
    case "song_title_desc":
    case "status":
      return true;
    default:
      return false;
  }
};

const parseSortParam = (value: string | string[] | undefined): JobSort => {
  const resolved = Array.isArray(value) ? value[0] : value;
  const normalized = resolved?.trim().toLowerCase();

  if (normalized && isJobSort(normalized)) {
    return normalized;
  }

  return "queue";
};

const JOB_SORT_LABELS: Record<JobSort, string> = {
  queue: "Queue order",
  updated_desc: "Updated (newest first)",
  updated_asc: "Updated (oldest first)",
  song_title_asc: "Song title (A-Z)",
  song_title_desc: "Song title (Z-A)",
  status: "Status",
};

const JOB_STATUS_ORDER: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  failed: 2,
  completed: 3,
};

const sortJobs = (
  jobs: readonly Awaited<
    ReturnType<typeof fetchSongGenerationJobList>
  >[number][],
  sortBy: JobSort,
) => {
  const withTimestamps = (value: string): number => new Date(value).getTime();

  const sorted = [...jobs];
  sorted.sort((left, right) => {
    const updatedLeft = withTimestamps(left.updatedAt ?? left.createdAt);
    const updatedRight = withTimestamps(right.updatedAt ?? right.createdAt);

    switch (sortBy) {
      case "queue":
        return (
          withTimestamps(right.createdAt) - withTimestamps(left.createdAt) ||
          left.verseSequence - right.verseSequence
        );
      case "updated_desc":
        return updatedRight - updatedLeft;
      case "updated_asc":
        return updatedLeft - updatedRight;
      case "song_title_asc":
        return (
          left.songTitle.localeCompare(right.songTitle, undefined, {
            sensitivity: "base",
          }) || left.verseSequence - right.verseSequence
        );
      case "song_title_desc":
        return (
          right.songTitle.localeCompare(left.songTitle, undefined, {
            sensitivity: "base",
          }) || left.verseSequence - right.verseSequence
        );
      case "status": {
        const leftOrder = JOB_STATUS_ORDER[left.status] ?? 99;
        const rightOrder = JOB_STATUS_ORDER[right.status] ?? 99;
        return leftOrder - rightOrder || updatedRight - updatedLeft;
      }
      default:
        return 0;
    }
  });

  return sorted;
};

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

const getErrorPreviewLimit = (status: string): number =>
  status === "failed" ? 280 : 90;

const STATUS_BADGE_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  in_progress: "info",
  failed: "error",
  completed: "success",
};

const AdminJobsPage = async ({ searchParams }: AdminJobsPageProps) => {
  const resolvedParams = await Promise.resolve(searchParams ?? {});
  const searchText = parseSearchParam(resolvedParams.q);
  const hidePublished = parseBooleanParam(resolvedParams.hidePublished, true);
  const sortBy = parseSortParam(resolvedParams.sort);

  const jobsRaw = await fetchSongGenerationJobList({
    limit: DEFAULT_JOB_LIMIT,
    excludePublished: hidePublished,
    searchText,
  });
  const jobs = sortJobs(jobsRaw, sortBy);

  return (
    <PageShell variant="embedded">
      <HeroHeader
        title="Illustration queue"
        description="Each verse generates an illustration job. Keep an eye on the queue and retry if something fails."
      />

      <Panel>
        <Heading level={2} className="text-base">
          Recent jobs
        </Heading>
        <Body size="sm" className="text-stone-600 dark:text-stone-300">
          Jobs are ordered by status and most recent updates. Use the actions
          below to keep things moving.
        </Body>
        <div className="mt-4">
          <ProcessJobForm action={processNextJobAction} />
        </div>
        <hr className="my-6 border-stone-200 dark:border-stone-700" />
        <form className="mt-4 flex flex-wrap items-end gap-4">
          <FormField
            label="Search title or lyrics"
            htmlFor="job-search"
            className="min-w-64 flex-1"
          >
            <input
              id="job-search"
              name="q"
              type="search"
              defaultValue={searchText}
              placeholder="e.g. storm or lullaby"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-100"
            />
          </FormField>
          <FormField label="Visibility" htmlFor="job-hide-published">
            <label className="flex h-10 items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
              <input
                id="job-hide-published"
                type="checkbox"
                name="hidePublished"
                value="1"
                defaultChecked={hidePublished}
                className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-stone-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
              Hide published songs
            </label>
          </FormField>
          <FormField label="Sort by" htmlFor="job-sort" className="min-w-56">
            <select
              id="job-sort"
              name="sort"
              defaultValue={sortBy}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-100"
            >
              {Object.entries(JOB_SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex min-w-fit flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
              Actions
            </span>
            <div className="flex h-10 items-center gap-2">
              <Button type="submit" variant="secondary" size="sm">
                Apply filters
              </Button>
              <Button as="a" href={JOBS_PATH} variant="link" size="sm">
                Reset
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6 -mx-4 overflow-x-auto sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 shadow-sm dark:border-stone-700/60 dark:bg-stone-900/40">
              <table className="min-w-[1150px] divide-y divide-stone-200/70 text-sm dark:divide-stone-800/60">
                <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 dark:bg-stone-900 dark:text-stone-300">
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
                <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/60">
                  {jobs.map((job) => {
                    const badgeVariant =
                      STATUS_BADGE_VARIANTS[job.status] ?? "neutral";
                    const canReset = job.status !== "pending";

                    return (
                      <tr
                        key={job.id}
                        className="transition hover:bg-stone-50 dark:hover:bg-stone-900/40"
                      >
                        <td className="px-4 py-4 font-medium text-stone-900 dark:text-stone-100">
                          <div className="whitespace-nowrap">
                            {job.songTitle}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400">
                            /{job.songSlug}
                          </div>
                          <div className="mt-1 text-[11px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
                            {job.isPublished ? "Published" : "Draft"}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-stone-700 dark:text-stone-300">
                          <div className="font-medium">
                            Verse {job.verseSequence}
                          </div>
                          <div className="max-w-48 whitespace-pre overflow-hidden text-ellipsis text-xs text-stone-500 dark:text-stone-400">
                            {truncate(job.verseLyric, 120)}
                          </div>
                          {job.status === "completed" &&
                          job.verseIllustrationUrl ? (
                            <a
                              href={job.verseIllustrationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-xs font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                            >
                              View illustration
                              <HiArrowTopRightOnSquare className="ml-1 mt-0.5" />
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant={badgeVariant}
                            className="px-2.5 py-0.5"
                          >
                            {job.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-stone-600 dark:text-stone-300">
                          {job.attempts}
                        </td>
                        <td className="px-4 py-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                          {formatTimestamp(job.updatedAt ?? job.createdAt)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          {job.lastError ? (
                            <div
                              className={
                                job.status === "failed"
                                  ? "text-rose-700 dark:text-rose-300"
                                  : "text-rose-600 dark:text-rose-300"
                              }
                            >
                              <p className="max-w-[34rem] text-xs leading-5 whitespace-pre-wrap break-words">
                                {truncate(
                                  job.lastError,
                                  getErrorPreviewLimit(job.status),
                                )}
                              </p>
                              {job.lastError.length >
                              getErrorPreviewLimit(job.status) ? (
                                <details className="mt-1 text-xs">
                                  <summary className="cursor-pointer underline decoration-rose-400 underline-offset-2">
                                    View full error
                                  </summary>
                                  <pre className="mt-1 max-h-52 overflow-auto rounded-lg border border-rose-200/70 bg-rose-50/70 p-2 text-[11px] whitespace-pre-wrap break-words dark:border-rose-800/70 dark:bg-rose-950/40">
                                    {job.lastError}
                                  </pre>
                                </details>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          {canReset ? (
                            <RequeueJobControls
                              songId={job.songId}
                              verseId={job.verseId}
                              verseSequence={job.verseSequence}
                            />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Body
                          size="sm"
                          className="text-stone-500 dark:text-stone-400"
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
