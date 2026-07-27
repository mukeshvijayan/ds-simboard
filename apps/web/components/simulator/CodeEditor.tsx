"use client";

import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const theme = EditorView.theme({
  "&": {
    backgroundColor: "#1C1B18",
    height: "100%",
    fontSize: "13px",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    caretColor: "#FAF8F3",
    color: "#D4D4D4",
  },
  ".cm-gutters": {
    backgroundColor: "#1C1B18",
    // 0.35 alpha computed under 4.5:1 against this dark background —
    // bumped for WCAG AA contrast (line numbers are still real text).
    color: "rgba(250,248,243,0.6)",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(250,248,243,0.04)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(250,248,243,0.04)",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

/** CodeMirror's contenteditable region otherwise has no accessible name. */
const accessibleLabel = EditorView.contentAttributes.of({
  "aria-label": "Sketch code editor",
});

/**
 * A custom syntax palette rather than the bundled `theme="dark"` preset —
 * that preset's own background (`#282c34`) and one of its token colors
 * came out at 4.38:1 against it, just under WCAG AA's 4.5:1 (caught by
 * the axe scan in the Phase 10 accessibility pass). Every color below is
 * checked against this file's actual `#1C1B18` editor background instead
 * of inheriting a bundled theme's own.
 */
const syntaxColors = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "#7DA6D9" },
    { tag: [tags.string, tags.special(tags.string)], color: "#E0A96D" },
    { tag: tags.number, color: "#B5CEA8" },
    { tag: tags.comment, color: "#8A9A7B", fontStyle: "italic" },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      color: "#DCDCAA",
    },
    { tag: tags.typeName, color: "#4EC9B0" },
    { tag: tags.operator, color: "#D4D4D4" },
  ])
);

export function CodeEditor({ value, onChange, readOnly }: CodeEditorProps) {
  return (
    <div className="h-full w-full">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[cpp(), theme, syntaxColors, accessibleLabel]}
        theme="none"
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
        }}
        height="100%"
        style={{ height: "100%" }}
      />
    </div>
  );
}
