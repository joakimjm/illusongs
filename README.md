This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Song Filtering

The front page now supports client‑side filtering of songs:

- Free text: matches song titles and full verse text (case-insensitive, Danish locale lower‑casing).
- Tags: click tags (grouped by category) to filter. All selected tags must be present in a song (logical AND).
- Counts: Displays how many songs match relative to total.
- Reset controls: "Ryd søgning" clears text; "Nulstil valgte tags" clears tags.

Implementation overview:

- Data parsing extended (`src/data/songs.ts`) to include a `tags: string[]` field for each song (normalized to lowercase).
- Tag categories parsed from `public/tags.json` via `src/data/tags.ts`.
- UI components:
	- `SongFilters` – controlled form with text input + tag pills.
	- `SongBrowser` – orchestrates filters + derived list (memoized) and renders `SongList`.

To adjust logic (e.g., change AND to OR), modify `matchesTags` in `src/components/song-browser.tsx`.

