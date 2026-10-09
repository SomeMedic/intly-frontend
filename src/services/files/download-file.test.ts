import { afterEach, describe, expect, it } from "vitest";
import { downloadStoredFileFromGrant, resolveStoredFileDownloadUrl } from "./download-file";

const options = { apiBaseUrl: "http://localhost:3001/api/v1", windowOrigin: "http://localhost:3300" };

type FakeAnchor = {
  href: string;
  download: string;
  referrerPolicy: string;
  rel: string;
  clicked: boolean;
  click: () => void;
  remove: () => void;
};

type FakeDom = { anchors: FakeAnchor[]; body: { appended: FakeAnchor[]; contains: (anchor: FakeAnchor) => boolean } };

type MutableGlobal = typeof globalThis & { document?: Document; window?: Window };

const originalDocument = (globalThis as MutableGlobal).document;
const originalWindow = (globalThis as MutableGlobal).window;

function installFakeDom(): FakeDom {
  const anchors: FakeAnchor[] = [];
  const body = {
    appended: [] as FakeAnchor[],
    append(anchor: FakeAnchor) {
      this.appended.push(anchor);
    },
    contains(anchor: FakeAnchor) {
      return this.appended.includes(anchor);
    },
  };
  const fakeDocument = {
    body,
    createElement(tag: string) {
      expect(tag).toBe("a");
      const anchor: FakeAnchor = {
        href: "",
        download: "",
        referrerPolicy: "",
        rel: "",
        clicked: false,
        click() {
          this.clicked = true;
        },
        remove() {
          const index = body.appended.indexOf(this);
          if (index >= 0) body.appended.splice(index, 1);
        },
      };
      anchors.push(anchor);
      return anchor;
    },
  };
  Object.defineProperty(globalThis, "document", { configurable: true, value: fakeDocument });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "http://localhost:3300" } } });
  return { anchors, body };
}

afterEach(() => {
  if (originalDocument === undefined) Reflect.deleteProperty(globalThis, "document");
  else Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  if (originalWindow === undefined) Reflect.deleteProperty(globalThis, "window");
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

describe("stored file download grants", () => {
  it("resolves relative and absolute API download URLs under the configured API path", () => {
    expect(resolveStoredFileDownloadUrl("/api/v1/files/file-1/download?ticket=abc", "file-1", options)).toBe("http://localhost:3001/api/v1/files/file-1/download?ticket=abc");
    expect(resolveStoredFileDownloadUrl("http://localhost:3001/api/v1/files/file-1/download?ticket=abc", "file-1", options)).toBe("http://localhost:3001/api/v1/files/file-1/download?ticket=abc");
    expect(resolveStoredFileDownloadUrl("/api/v1/files/file-1/download?ticket=abc", "file-1", { apiBaseUrl: "/api/v1", windowOrigin: "http://localhost:3001" })).toBe("http://localhost:3001/api/v1/files/file-1/download?ticket=abc");
  });

  it("rejects unsafe or unexpected grant URLs before clicking", () => {
    const fakeDom = installFakeDom();
    expect(() => downloadStoredFileFromGrant({ fileId: "file-1", filename: "x.pdf", grantUrl: "https://evil.test/api/v1/files/file-1/download?ticket=abc" }, options)).toThrow("Invalid file download URL");
    expect(() => downloadStoredFileFromGrant({ fileId: "file-1", filename: "x.pdf", grantUrl: "javascript:alert(1)" }, options)).toThrow("Invalid file download URL");
    expect(() => downloadStoredFileFromGrant({ fileId: "file-1", filename: "x.pdf", grantUrl: "/api/v1/files/file-2/download?ticket=abc" }, options)).toThrow("Invalid file download URL");
    expect(() => downloadStoredFileFromGrant({ fileId: "file-1", filename: "x.pdf", grantUrl: "/api/v1/files/file-1/download?ticket=abc#token" }, options)).toThrow("Invalid file download URL");
    expect(fakeDom.anchors).toHaveLength(0);
  });

  it("clicks an attachment link with download filename and no referrer", () => {
    const fakeDom = installFakeDom();
    downloadStoredFileFromGrant({ fileId: "file-1", filename: "report.pdf", grantUrl: "/api/v1/files/file-1/download?ticket=abc" }, options);
    expect(fakeDom.anchors).toHaveLength(1);
    const anchor = fakeDom.anchors[0];
    expect(anchor.href).toBe("http://localhost:3001/api/v1/files/file-1/download?ticket=abc");
    expect(anchor.download).toBe("report.pdf");
    expect(anchor.referrerPolicy).toBe("no-referrer");
    expect(anchor.rel).toBe("noopener");
    expect(anchor.clicked).toBe(true);
    expect(fakeDom.body.contains(anchor)).toBe(false);
  });
});
