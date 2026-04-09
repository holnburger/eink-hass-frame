import { describe, expect, test } from "bun:test";

import { rewriteResponseBody } from "./start-addon.mjs";

describe("rewriteResponseBody", () => {
  test("rewrites plain ingress asset and API paths", () => {
    const rewritten = rewriteResponseBody(
      [
        '<script src="/_next/static/chunk.js"></script>',
        '<link rel="icon" href="/favicon.ico?x=1">',
        '<style>body{background:url("/mock/cover.jpg")}</style>',
        '<a href="/api/runtime-info">runtime</a>',
      ].join(""),
      "/api/hassio_ingress/token",
    );

    expect(rewritten).toContain(
      'src="/api/hassio_ingress/token/_next/static/chunk.js"',
    );
    expect(rewritten).toContain(
      'href="/api/hassio_ingress/token/favicon.ico?x=1"',
    );
    expect(rewritten).toContain(
      'url("/api/hassio_ingress/token/mock/cover.jpg")',
    );
    expect(rewritten).toContain(
      'href="/api/hassio_ingress/token/api/runtime-info"',
    );
  });

  test("rewrites escaped Next.js inline flight payload paths", () => {
    const rewritten = rewriteResponseBody(
      String.raw`self.__next_f.push([1,"6:I[31713,[\"/_next/static/chunks/a.js\",\"/_next/static/chunks/b.js\"],\"default\"]\nf:[[\"$\",\"link\",\"0\",{\"rel\":\"icon\",\"href\":\"/favicon.ico?x=1\"}],[\"$\",\"$1\",\"1\",{}]]\n"])`,
      "/api/hassio_ingress/token",
    );

    expect(rewritten).toContain(String.raw`\"/api/hassio_ingress/token/_next/static/chunks/a.js\"`);
    expect(rewritten).toContain(String.raw`\"/api/hassio_ingress/token/_next/static/chunks/b.js\"`);
    expect(rewritten).toContain(String.raw`\"/api/hassio_ingress/token/favicon.ico?x=1\"`);
  });

  test("does not change responses when no ingress path is set", () => {
    const body = String.raw`<script>window.asset=\"/_next/static/chunk.js\"</script>`;
    expect(rewriteResponseBody(body, "")).toBe(body);
  });
});
