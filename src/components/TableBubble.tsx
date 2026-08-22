import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Combine,
  Heading,
  Split,
  Trash2,
} from "lucide-react";

import { Button } from "./ui/Button";
import { Tooltip } from "./ui/Tooltip";

/** Row/column controls, shown while the caret rests inside a table. */
export function TableBubble({ editor }: { editor: Editor }) {
  const run = (fn: () => void) => () => fn();

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubble"
      updateDelay={100}
      options={{ placement: "top-start", offset: 10, flip: true, shift: true }}
      shouldShow={({ editor: instance, state }) =>
        instance.isEditable && instance.isActive("table") && state.selection.empty
      }
      className="flex items-center gap-0.5 rounded-xl border border-edge bg-panel p-1 shadow-float"
    >
      <Tooltip label="Row above">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().addRowBefore().run())}
          aria-label="Insert row above"
        >
          <ArrowUpToLine className="size-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Row below">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().addRowAfter().run())}
          aria-label="Insert row below"
        >
          <ArrowDownToLine className="size-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Delete row">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().deleteRow().run())}
          aria-label="Delete row"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </Tooltip>

      <span className="mx-0.5 h-4 w-px bg-edge" />

      <Tooltip label="Column left">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().addColumnBefore().run())}
          aria-label="Insert column left"
        >
          <ArrowLeftToLine className="size-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Column right">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().addColumnAfter().run())}
          aria-label="Insert column right"
        >
          <ArrowRightToLine className="size-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Delete column">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().deleteColumn().run())}
          aria-label="Delete column"
        >
          <Trash2 className="size-3.5 rotate-90" />
        </Button>
      </Tooltip>

      <span className="mx-0.5 h-4 w-px bg-edge" />

      <Tooltip label="Toggle header row">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().toggleHeaderRow().run())}
          aria-label="Toggle header row"
        >
          <Heading className="size-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Merge cells">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().mergeCells().run())}
          aria-label="Merge cells"
        >
          <Combine className="size-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Split cell">
        <Button
          size="icon-sm"
          onClick={run(() => editor.chain().focus().splitCell().run())}
          aria-label="Split cell"
        >
          <Split className="size-3.5" />
        </Button>
      </Tooltip>

      <span className="mx-0.5 h-4 w-px bg-edge" />

      <Tooltip label="Delete table">
        <Button
          size="icon-sm"
          variant="danger"
          onClick={run(() => editor.chain().focus().deleteTable().run())}
          aria-label="Delete table"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </Tooltip>
    </BubbleMenu>
  );
}
