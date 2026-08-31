const root = new URL('../../dist/', import.meta.url);

Bun.serve({
  hostname: '127.0.0.1',
  port: 4350,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname.includes('..')) return new Response('Forbidden', { status: 403 });

    const candidates = pathname.endsWith('/')
      ? [`${pathname}index.html`]
      : [pathname, `${pathname}/index.html`];
    for (const relativePath of candidates) {
      const file = Bun.file(new URL(`.${relativePath}`, root));
      if (await file.exists()) return new Response(file);
    }

    return new Response('Not found', { status: 404 });
  },
});
