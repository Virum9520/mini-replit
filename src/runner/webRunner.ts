// Builds a self-contained HTML document from workspace files so it can run
// inside a sandboxed iframe (sandbox="allow-scripts", no same-origin access).
// console.* output and runtime errors are forwarded to the parent window
// via postMessage.

import { RUNNER_MESSAGE_SOURCE } from './types'

const CONSOLE_SHIM = `<script>
(function () {
  function fmt(a) {
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }
  function send(level, args) {
    try {
      parent.postMessage({
        source: '${RUNNER_MESSAGE_SOURCE}',
        level: level,
        text: Array.prototype.map.call(args, fmt).join(' ')
      }, '*');
    } catch (e) { /* ignore */ }
  }
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      send(level, arguments);
      orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    send('error', [e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function (e) {
    send('error', ['Unhandled rejection: ' + fmt(e.reason)]);
  });
})();
</script>`

function escapeScriptContent(code: string): string {
  // Prevent an inline "</script>" in user code from closing our tag early.
  return code.replace(/<\/script/gi, '<\\/script')
}

/**
 * Build a runnable document from an HTML entry file. Local
 * <script src="..."> and <link rel="stylesheet" href="..."> references are
 * inlined from the workspace so they work inside the sandboxed iframe.
 */
export function buildHtmlDoc(
  files: Record<string, string>,
  entry: string,
): string {
  let html = files[entry] ?? ''

  // Inline local scripts.
  html = html.replace(
    /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (match, src: string) => {
      const file = files[src] ?? files[src.replace(/^\.\//, '')]
      if (file === undefined) return match
      return `<script>${escapeScriptContent(file)}</script>`
    },
  )

  // Inline local stylesheets.
  html = html.replace(
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    (match, href: string) => {
      if (!/rel=["']stylesheet["']/i.test(match)) return match
      const file = files[href] ?? files[href.replace(/^\.\//, '')]
      if (file === undefined) return match
      return `<style>${file}</style>`
    },
  )

  // Inject the console shim as early as possible.
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${CONSOLE_SHIM}`)
  } else {
    html = CONSOLE_SHIM + html
  }

  return html
}

/** Wrap a standalone JS file in a minimal document and run it. */
export function buildJsDoc(files: Record<string, string>, entry: string): string {
  const code = files[entry] ?? ''
  return `<!doctype html>
<html>
<head>${CONSOLE_SHIM}</head>
<body style="background:#1b1b1b;color:#e8e8e8;font-family:monospace;padding:1rem">
<script>${escapeScriptContent(code)}</script>
</body>
</html>`
}
