import * as vscode from 'vscode';

export interface RenderArgs {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  nonce: string;
}

export function renderHtml({ webview, extensionUri, nonce }: RenderArgs): string {
  const cspSource = webview.cspSource;
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'webview.js'),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'webview.css'),
  );

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${nonce}'; img-src ${cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>StashPad</title>
</head>
<body>
  <div class="capture-wrap">
    <div class="capture">
      <span class="plus">+</span>
      <input type="text" id="captureInput" placeholder="park a thought…" autocomplete="off">
    </div>
    <div class="capture-hint">
      <span><kbd>↵</kbd>park</span>
      <span><kbd>/</kbd>search</span>
      <span><kbd>click</kbd>drop in terminal</span>
    </div>
  </div>

  <div class="filter-bar">
    <div class="search-wrap">
      <span class="search-icon">⌕</span>
      <input type="text" id="searchInput" placeholder="filter cards…" autocomplete="off">
    </div>
    <div class="filter-chips" id="filterChips"></div>
  </div>

  <div class="zone zone-next">
    <div class="zone-head">
      <span class="zone-label">Next Up</span>
      <span class="zone-count" id="nextCount" style="display:none">0</span>
    </div>
    <div class="cards" id="nextUp"></div>
    <div class="nothing" id="nextEmpty">
      <strong>nothing on deck</strong>
      <em>promote a card here to keep it ready</em>
    </div>
  </div>

  <div class="zone zone-parked">
    <div class="zone-head">
      <span class="zone-label">Parked</span>
      <span class="zone-count" id="parkedCount">0</span>
    </div>
    <div class="parked-scroll" id="parked"></div>
    <div class="nothing" id="parkedHint">
      <strong>your scratch tray</strong>
      <em>park thoughts while claude works — drop them in later</em>
    </div>
    <button class="new-folder" id="newFolderBtn">+ new folder</button>
  </div>

  <div class="footer">
    <span class="footer-tip"><span class="footer-dot"></span>one-shot vanishes · sticky stays</span>
    <span id="footerStats">empty</span>
  </div>

  <div class="toast" id="toast"></div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
