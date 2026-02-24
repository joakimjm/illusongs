import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("defaults to type button", () => {
    render(<Button>Save</Button>);

    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("type"),
    ).toBe("button");
  });

  it("supports polymorphic rendering with as", () => {
    render(
      <Button as="span" variant="secondary" size="sm">
        Open editor
      </Button>,
    );

    const element = screen.getByText("Open editor");
    expect(element.tagName).toBe("SPAN");
    expect(element.className).toContain("inline-flex");
    expect(element.className).toContain("border");
  });

  it("allows links to reuse button styles", () => {
    render(
      <Button as="a" href="/admin/songs" variant="secondary" size="sm">
        Edit lyrics
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Edit lyrics" });
    expect(link.getAttribute("href")).toBe("/admin/songs");
    expect(link.className).toContain("inline-flex");
  });
});
