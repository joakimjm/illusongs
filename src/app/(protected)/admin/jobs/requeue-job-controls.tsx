"use client";

import { VerseRequeueActions } from "@/features/songs/components/verse-requeue-actions";

type RequeueJobControlsProps = {
  songId: string;
  verseId: string;
  verseSequence: number;
  onPublish?: () => Promise<void>;
};

export const RequeueJobControls = ({
  songId,
  verseId,
  verseSequence,
  onPublish,
}: RequeueJobControlsProps) => {
  return (
    <VerseRequeueActions
      songId={songId}
      verseId={verseId}
      verseSequence={verseSequence}
      toggleAriaLabel={`Open options for verse ${verseSequence}`}
      splitButtonVariant="primary"
      appearance="light"
      onPublish={onPublish}
    />
  );
};
