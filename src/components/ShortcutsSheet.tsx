import { Modal } from "./Modal";
import { Button } from "./ui/Button";
import { formatShortcut } from "@/lib/utils";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "File",
    items: [
      ["New", "Mod+N"],
      ["Open…", "Mod+O"],
      ["Save", "Mod+S"],
      ["Save As…", "Mod+Shift+S"],
      ["Reveal in Finder", "Mod+Alt+R"],
    ],
  },
  {
    title: "Format",
    items: [
      ["Bold", "Mod+B"],
      ["Italic", "Mod+I"],
      ["Underline", "Mod+U"],
      ["Strikethrough", "Mod+Shift+X"],
      ["Highlight", "Mod+Shift+H"],
      ["Inline code", "Mod+Shift+C"],
      ["Link…", "Mod+K"],
      ["Paragraph", "Mod+0"],
      ["Heading 1–6", "Mod+1…6"],
      ["Clear formatting", "Mod+Shift+K"],
    ],
  },
  {
    title: "Insert",
    items: [
      ["Bullet list", "Mod+Shift+8"],
      ["Ordered list", "Mod+Shift+7"],
      ["Task list", "Mod+Shift+9"],
      ["Blockquote", "Mod+Shift+B"],
      ["Code block", "Mod+Alt+C"],
      ["Table", "Mod+Alt+T"],
      ["Math block", "Mod+Alt+M"],
      ["Image…", "Mod+Alt+I"],
      ["Horizontal rule", "Mod+Alt+H"],
    ],
  },
  {
    title: "View",
    items: [
      ["Toggle outline", "Mod+\\"],
      ["Dark mode", "Mod+Shift+D"],
      ["Source mode", "Mod+/"],
      ["Typewriter mode", "Mod+Alt+P"],
      ["Focus mode", "Mod+Alt+F"],
      ["Auto-save", "Mod+Alt+S"],
      ["Preferences", "Mod+,"],
    ],
  },
  {
    title: "Markdown as you type",
    items: [
      ["Heading", "# … ######"],
      ["Bold / italic", "**bold**  *italic*"],
      ["Strikethrough", "~~text~~"],
      ["Highlight", "==text=="],
      ["Quote", "> "],
      ["Lists", "-   1.   - [ ] "],
      ["Code fence", "```lang"],
      ["Rule", "---"],
      ["Inline maths", "$e^{i\\pi}$"],
      ["Display maths", "$$…$$"],
    ],
  },
];

/** Reference sheet for everything bound to a key. */
export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      className="w-[min(46rem,calc(100vw-3rem))]"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid max-h-[58vh] grid-cols-1 gap-x-8 gap-y-4 overflow-y-auto sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-1 text-[10px] font-semibold tracking-wider text-ink-faint uppercase">
              {group.title}
            </h3>
            <dl className="flex flex-col">
              {group.items.map(([label, keys]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-b border-edge py-1"
                >
                  <dt className="text-[12.5px] text-ink">{label}</dt>
                  <dd className="font-mono text-[11px] text-ink-muted">
                    {keys.includes("Mod") ? formatShortcut(keys) : keys}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
