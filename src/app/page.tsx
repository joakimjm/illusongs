import SongList from "@/components/song-list";
import { listSongs } from "@/data/songs";

const HomePage = () => {
  const songs = listSongs();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 md:px-10 lg:pt-24">
      <section className="rounded-4xl bg-white/70 p-10 text-center shadow-sm ring-1 ring-white/60 backdrop-blur-md md:p-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
          Illustrerede børnesange
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900 md:text-5xl">
          Syng, læs og se historien folde sig ud
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
          Illusongs samler danske børnesange og giver dem nyt liv med lysende
          illustrationer. Del musikken med familiens yngste, og opdag nye vers
          undervejs.
        </p>
      </section>
      <SongList songs={songs} />
    </main>
  );
};

export default HomePage;
