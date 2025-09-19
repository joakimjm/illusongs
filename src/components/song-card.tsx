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
    <article className="group flex overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/songs/${song.id}`} className="flex flex-auto">
        <div className="relative w-24 overflow-hidden">
          <Image
            src={leadVerse.illustration.src}
            alt={leadVerse.illustration.alt}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 280px"
            priority={false}
          />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <h2 className="font-semibold text-slate-900">{song.title}</h2>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
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
