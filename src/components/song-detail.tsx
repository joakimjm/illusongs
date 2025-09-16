import Image from "next/image";

import type { Song } from "@/data/songs";

type SongDetailProps = {
  readonly song: Song;
};

const SongDetail = ({ song }: SongDetailProps) => (
  <article className="flex flex-col gap-12">
    <header className="text-center md:text-left">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
        Dansk børnesang
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-slate-900 md:text-5xl">
        {song.title}
      </h1>
    </header>
    <ol className="flex flex-col gap-12">
      {song.verses.map((verse) => (
        <li key={verse.id} className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className="overflow-hidden rounded-3xl bg-white/70 ring-1 ring-black/5">
            <Image
              src={verse.illustration.src}
              alt={verse.illustration.alt}
              width={900}
              height={900}
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="rounded-3xl bg-amber-50/70 p-6 text-lg leading-relaxed text-slate-800 ring-1 ring-amber-500/10">
            <p className="whitespace-pre-line">{verse.text}</p>
          </div>
        </li>
      ))}
    </ol>
  </article>
);

export default SongDetail;
