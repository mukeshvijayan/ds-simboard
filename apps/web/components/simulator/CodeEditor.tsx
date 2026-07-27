"use client";

import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView } from "@codemirror/view";

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
  },
  ".cm-gutters": {
    backgroundColor: "#1C1B18",
    color: "rgba(250,248,243,0.35)",
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

export function CodeEditor({ value, onChange, readOnly }: CodeEditorProps) {
  return (
    <div className="h-full w-full">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[cpp(), theme]}
        theme="dark"
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
