import * as vscode from "vscode";

const numberFormat = new Intl.NumberFormat();

/**
 * Word count for the IDE's own status bar, rather than a second status bar
 * inside the webview.
 */
export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = "MarkType";
    this.item.tooltip = "MarkType — words in this document";
  }

  update(stats: { words: number; characters: number; readingMinutes: number }) {
    const reading = stats.readingMinutes > 0 ? ` · ${stats.readingMinutes} min read` : "";
    this.item.text = `$(book) ${numberFormat.format(stats.words)} words${reading}`;
    this.item.tooltip = `${numberFormat.format(stats.words)} words · ${numberFormat.format(
      stats.characters,
    )} characters`;
  }

  show() {
    this.item.show();
  }

  hide() {
    this.item.hide();
  }

  dispose() {
    this.item.dispose();
  }
}
