import { describe, expect, it } from "vitest";
import { descriptionPreviewText } from "./description-preview";

describe("descriptionPreviewText", () => {
  it("renders native HTML as readable preview text with block spacing and decoded entities", () => {
    const html = "<p><strong>СберЗдоровье</strong> — аккредитованная ИТ-компания&nbsp;&amp;&nbsp;платформа.</p><p><em>DevOps/MLOps</em> role.</p>";
    expect(descriptionPreviewText(html)).toBe("СберЗдоровье — аккредитованная ИТ-компания & платформа.\n\nDevOps/MLOps role.");
  });

  it("removes non-visible payloads and comments from preview text", () => {
    const html = "<p>Visible</p><!-- hidden --><script>alert(1)</script><style>.x{display:none}</style><p>Tail</p>";
    expect(descriptionPreviewText(html)).toBe("Visible\n\nTail");
  });

  it("keeps plain text comparisons and angle-like text untouched", () => {
    const text = "  C++ < Rust, опыт < 5 лет, keep <custom angle>  ";
    expect(descriptionPreviewText(text)).toBe("C++ < Rust, опыт < 5 лет, keep <custom angle>");
  });

  it("keeps list separators readable", () => {
    const html = "<p>Stack</p><ul><li>Python&nbsp;&lt;&nbsp;3.13 support</li><li>SQL &amp; ETL</li></ul>";
    expect(descriptionPreviewText(html)).toBe("Stack\n\n• Python < 3.13 support\n• SQL & ETL");
  });

  it("preserves comparisons and generic types inside native HTML", () => {
    expect(descriptionPreviewText("<p>опыт < 5 лет, C++ < Rust, Promise<T></p>")).toBe("опыт < 5 лет, C++ < Rust, Promise<T>");
    expect(descriptionPreviewText('<p><a title="rate > 5">Work</a></p>')).toBe("Work");
  });

  it("removes hidden payload even when no visible HTML tags exist", () => {
    expect(descriptionPreviewText("<!-- hidden --><script>alert(1)</script><style>.x{display:none}</style>")).toBe("");
  });

  it("removes a trailing HTML fragment when a search excerpt is cut mid-tag", () => {
    expect(descriptionPreviewText("<p>Python role</p><ul><li>Build APIs</li")).toBe("Python role\n\n• Build APIs");
    expect(descriptionPreviewText('<p>Python role</p><a href="https://example')).toBe("Python role");
  });
});
