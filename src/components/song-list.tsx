import SongCard from "@/components/song-card";
import type { Song } from "@/data/songs";

type SongListProps = {
  readonly songs: ReadonlyArray<Song>;
};

const SongList = ({ songs }: SongListProps) => {
  if (songs.length === 0) {
    return (
      <p className="rounded-3xl bg-white/70 p-6 text-lg text-slate-700">
        Der er ingen sange endnu. Kom snart tilbage for flere melodier.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {songs
        .toSorted((a, b) => a.title.localeCompare(b.title))
        .map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
    </section>
  );
};

export default SongList;
