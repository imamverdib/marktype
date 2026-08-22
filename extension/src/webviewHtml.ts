import * as vscode from "vscode";

/** 32 hex characters, so the CSP can whitelist exactly our one script tag. */
function nonce() {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function editorHtml(webview: vscode.Webview, mediaRoot: vscode.Uri): string {
  const script = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "webview.js"));
  const styles = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "webview.css"));
  const token = nonce();

  // `unsafe-inline` for styles is required: ProseMirror and KaTeX both inject
  // style tags at runtime. Scripts stay locked to the single nonce.
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: data: blob:`,
    `font-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${token}'`,
  ].join("; ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styles}" rel="stylesheet" />
    <title>MarkType</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${token}" src="${script}"></script>
  </body>
</html>`;
}
