import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SongVerseCarousel } from "./song-verse-carousel";

const { routerMock } = vi.hoisted(() => ({
  routerMock: {
    back: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const TEST_VERSES = [
  {
    id: "verse-1",
    sequenceNumber: 1,
    lyricText: "Verse one",
    illustrationUrl: "https://example.com/illustration.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("SongVerseCarousel", () => {
  beforeEach(() => {
    routerMock.back.mockReset();
    routerMock.refresh.mockReset();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }

    globalThis.IntersectionObserver = MockIntersectionObserver;
  });

  it("does not render nested button elements", () => {
    const { container } = render(
      <SongVerseCarousel
        songTitle="Test song"
        verses={TEST_VERSES}
        enableRequeue
        songId="song-1"
        songSlug="test-song"
      />,
    );

    expect(container.querySelector("button button")).toBeNull();
  });

  it("renders elevated split-button controls for the requeue menu", () => {
    render(
      <SongVerseCarousel
        songTitle="Test song"
        verses={TEST_VERSES}
        enableRequeue
        songId="song-1"
        songSlug="test-song"
      />,
    );

    const toggleButton = screen.getAllByRole("button", {
      name: "Open requeue options for verse 1",
    })[0];

    const splitButtonContainer = toggleButton.closest("div");
    expect(splitButtonContainer?.className).toContain("z-40");

    fireEvent.click(toggleButton);

    const menu = screen.getByRole("menu");
    expect(menu.className).toContain("z-50");
  });
});
