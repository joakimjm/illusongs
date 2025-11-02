# Illusongs — Base Project Specification

## 1. Vision
Illusongs (short for *Illustrated Songs*) brings Danish songs to life through generative illustration and interaction.  
It’s a digital songbook designed for *shared moments of singing and imagination*, not passive consumption.

**Core idea:** create an immersive, tactile-feeling illustrated song experience that encourages parents and children to sing, point, laugh, and connect — not to scroll.

---

## 2. Purpose and Audience
- **Purpose:** To rekindle a tradition of Danish song culture by making lyrics visually engaging and accessible.  
- **Primary audience:** Parents, children, and families.  
- **Secondary audience:** Educators and people seeking nostalgic or seasonal (e.g. Christmas) songs.  
- **Personal motivation:** Built to connect with the creator’s son — moments where he points, laughs, or says “mere!” are the success metric.

---

## 3. Product Shape
- **Form:** Mobile-first web app (Next.js + Supabase).  
- **User flow:**
  1. Browse or search songs by tags (theme, mood, figures, audience).  
  2. Open a song — it fills the screen with the illustration and lyrics for one verse.  
  3. Swipe horizontally (or use arrows) to move between verses.  
  4. Return home or zoom in for detail.  
- **Design philosophy:**  
  - Minimal UI, maximum immersion.  
  - No sound playback — the *human* voice is the instrument.  
  - Every verse is a self-contained illustrated moment.

---

## 4. Aesthetic and Tone
- **Visual style:**  
  Vintage Danish and Scandinavian children’s book look (1960s–70s).  
  Hand-painted gouache/ink textures with visible brush strokes and soft paper tone.  
  Surreal, humorous, and expressive compositions — warm, slightly chaotic, and poetic.

- **Emotional palette:**  
  Joy, absurdity, nostalgia, quiet humor, gentle strangeness.  
  Always rooted in affection and imagination rather than digital polish.

---

## 5. Technical Stack
- **Frontend:** Next.js, TypeScript, TailwindCSS  
- **Backend & Auth:** Supabase (PostgreSQL + storage + auth)  
- **Hosting:** Vercel  
- **AI / Automation:** OpenAI API for image generation and structured data extraction from raw song input.  
- **Data model:**  
  Songs stored as structured JSON objects containing verses, tags, and illustration metadata.

---

## 6. AI and Automation Intent
Illusongs includes a toolchain for automatically:
1. Parsing new songs into structured data (title, verses, metadata).  
2. Generating image prompts and illustrations for each verse.  
3. Producing a consistent artistic and emotional tone across the song.  

The system should maintain *stylistic coherence* and *emotional fidelity* rather than raw accuracy.

---

## 7. Success Criteria
- The illustration matches the emotional tone of the verse.  
- The experience encourages conversation and interaction.  
- Children engage — pointing, laughing, or mimicking sounds.  
- The app remains calm, simple, and human-centered, avoiding overstimulation.


## 9. AGENTS Context Summary
Illusongs operates within the domain of **illustrated songs**.  
Agents collaborate to:
- Parse new song input into structured data.  
- Generate verse-by-verse image prompts in the established visual style.  
- Maintain stylistic and emotional coherence across songs.  
- Ensure that output supports the goal of *human connection through song and illustration* rather than distraction or spectacle.

The domain tone is warm, poetic, vintage, and emotionally intelligent.