import { describe, expect, it } from "vitest";
import { plainOpportunityDescription } from "./contracts";

describe("plainOpportunityDescription", () => {
  it("compacts source HTML formatting whitespace while preserving full paragraphs and facts", () => {
    const html = `
      <div>
        <p>Мы развиваем сервисы для налоговой аналитики.</p>


        <p>Работодатель: ГНИВЦ</p>
        <p>Формат: гибрид</p>
      </div>
    `;
    expect(plainOpportunityDescription(html)).toBe("Мы развиваем сервисы для налоговой аналитики.\n\nРаботодатель: ГНИВЦ\n\nФормат: гибрид");
  });

  it("keeps headings, list lines, inline spacing and decodes common plus numeric entities", () => {
    const html = `<h2>Что делать</h2><p>Python&nbsp;&amp;&nbsp;SQL &#40;ETL&#41; &#x1F680;</p><ul><li>Писать API</li><li>Поддерживать x &lt; 5 checks</li></ul><p>Хвост сохранён &#999999999; &#x110000; &#xD800;</p>`;
    expect(plainOpportunityDescription(html)).toBe("Что делать\n\nPython & SQL (ETL) 🚀\n\n• Писать API\n• Поддерживать x < 5 checks\n\nХвост сохранён &#999999999; &#x110000; &#xD800;");
  });

  it("normalizes inline tag source newlines and omits script or style text", () => {
    const html = `<p>Python\n <strong>и SQL</strong>\n для ETL</p><script>alert(1)</script><style>.x{display:none}</style><p>Видимый хвост</p>`;
    expect(plainOpportunityDescription(html)).toBe("Python и SQL для ETL\n\nВидимый хвост");
  });

  it("keeps nested list paragraphs with their bullets and preserves the source tail", () => {
    const html = `<h2>The work</h2><p>Fully remote role.</p><ul><li dir="ltr"><p>Review images and responses.</p></li><li><p>Write clear justifications.</p><p>Include supporting sources.</p></li></ul><p>Pay is specified in the offer.</p>`;
    expect(plainOpportunityDescription(html)).toBe("The work\n\nFully remote role.\n\n• Review images and responses.\n• Write clear justifications.\n\nInclude supporting sources.\n\nPay is specified in the offer.");
  });

  it("does not strip plain text comparisons, indentation, angle text or regular line breaks", () => {
    const text = "  if x < 5 keep <custom angle>\n    indented line\nnormal line  ";
    expect(plainOpportunityDescription(text)).toBe("if x < 5 keep <custom angle>\n    indented line\nnormal line");
  });

  it("shows native Arc Markdown headings as readable labels without losing facts or code", () => {
    const text = "#### About the company\nA security startup.\n\n#### Engagement Details\n- Hours: 3–5 hours per day\n- Rate: 10–15 / hour; currency unspecified\n\n```python\n# Preserve this code comment\n  if x < 5:\n    pass\n```\n\n### Final requirement ###\nComplete source tail.";
    expect(plainOpportunityDescription(text)).toBe("About the company\nA security startup.\n\nEngagement Details\n- Hours: 3–5 hours per day\n- Rate: 10–15 / hour; currency unspecified\n\n```python\n# Preserve this code comment\n  if x < 5:\n    pass\n```\n\nFinal requirement\nComplete source tail.");
  });
});
