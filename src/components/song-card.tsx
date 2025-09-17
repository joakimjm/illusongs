import Image from "next/image";
import Link from "next/link";

import type { Song } from "@/data/songs";

type SongCardProps = {
  readonly song: Song;
};

const SongCard = ({ song }: SongCardProps) => {
  const leadVerse = song.verses[0];

  if (leadVerse === undefined) {
    return null;
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/songs/${song.id}`} className="flex flex-col">
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={leadVerse.illustration.src}
            alt={leadVerse.illustration.alt}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
            priority={false}
          />
        </div>
        <div className="flex flex-col gap-3 p-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            {song.title}
          </h2>
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Se sangen
            <span aria-hidden className="text-base">
              →
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
};

export default SongCard;
