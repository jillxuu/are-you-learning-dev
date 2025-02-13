import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";

interface Props {
  code: string;
  onCodeChange: (newCode: string) => void;
  onCheckCode: () => void;
  onReset: () => void;
}

export default function CodeEditingView({
  code,
  onCodeChange,
  onCheckCode,
  onReset,
}: Props) {
  const [editableRegions, setEditableRegions] = useState<
    { start: number; end: number }[]
  >([]);

  useEffect(() => {
    // Parse code to find editable regions marked with special comments
    const lines = code.split("\n");
    const regions: { start: number; end: number }[] = [];
    let currentStart: number | null = null;

    lines.forEach((line, index) => {
      if (line.includes("// @editable-begin")) {
        currentStart = index + 1;
      } else if (line.includes("// @editable-end") && currentStart !== null) {
        regions.push({
          start: currentStart,
          end: index,
        });
        currentStart = null;
      }
    });

    setEditableRegions(regions);
  }, [code]);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
  ) => {
    // Register the Move language
    monaco.languages.register({ id: "move" });

    // Set up Move language syntax highlighting
    monaco.languages.setMonarchTokensProvider("move", {
      defaultToken: "",
      tokenPostfix: ".move",
      keywords: [
        "public",
        "entry",
        "fun",
        "struct",
        "has",
        "key",
        "store",
        "copy",
        "drop",
        "module",
        "use",
        "script",
        "friend",
        "native",
        "const",
        "let",
      ],
      typeKeywords: [
        "u8",
        "u64",
        "u128",
        "bool",
        "address",
        "vector",
        "signer",
      ],

      tokenizer: {
        root: [
          [
            /[a-zA-Z_$][\w$]*/,
            {
              cases: {
                "@keywords": { token: "keyword" },
                "@typeKeywords": { token: "type" },
                "@default": { token: "identifier" },
              },
            },
          ],
          [/#\[[^\]]*\]/, { token: "attribute" }],
          [/\/\/.*$/, { token: "comment" }],
          [/"/, { token: "string", next: "@string" }],
          [/\d+/, { token: "number" }],
        ],
        string: [
          [/[^"]+/, { token: "string" }],
          [/"/, { token: "string", next: "@pop" }],
        ],
      },
    });

    // Set up theme
    monaco.editor.defineTheme("move-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "C586C0" },
        { token: "type", foreground: "4EC9B0" },
        { token: "identifier", foreground: "9CDCFE" },
        { token: "number", foreground: "B5CEA8" },
        { token: "string", foreground: "CE9178" },
        { token: "comment", foreground: "6A9955" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editor.foreground": "#D4D4D4",
        "editor.lineHighlightBackground": "#2F3337",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
      },
    });
    monaco.editor.setTheme("move-dark");

    // Add decorations for editable regions
    const decorations = editableRegions.map((region) => ({
      range: new monaco.Range(region.start, 1, region.end, 1),
      options: {
        isWholeLine: true,
        className: "editable-region",
        glyphMarginClassName: "editable-region-glyph",
        inlineClassName: "editable-region-inline",
      },
    }));

    editor.createDecorationsCollection(decorations);

    // Set up read-only regions
    const model = editor.getModel();
    if (model) {
      // Create read-only ranges for non-editable regions
      const readOnlyRanges: monaco.Range[] = [];
      let lastLine = 1;

      for (const region of editableRegions) {
        if (lastLine < region.start) {
          readOnlyRanges.push(
            new monaco.Range(
              lastLine,
              1,
              region.start - 1,
              model.getLineMaxColumn(region.start - 1),
            ),
          );
        }
        lastLine = region.end + 1;
      }

      // Add final read-only range if needed
      const totalLines = model.getLineCount();
      if (lastLine <= totalLines) {
        readOnlyRanges.push(
          new monaco.Range(
            lastLine,
            1,
            totalLines,
            model.getLineMaxColumn(totalLines),
          ),
        );
      }

      // Apply read-only ranges
      model.deltaDecorations(
        [],
        readOnlyRanges.map((range) => ({
          range,
          options: {
            inlineClassName: "readonly-region",
            stickiness:
              monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            readOnly: true,
          },
        })),
      );
    }

    // Update editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      lineNumbers: "on",
      renderLineHighlight: "all",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      hover: { enabled: true },
      mouseStyle: "text",
      cursorStyle: "line-thin",
      links: true,
      colorDecorators: true,
      renderWhitespace: "none",
      contextmenu: false,
      folding: true,
      showFoldingControls: "always",
      glyphMargin: true,
      suggest: {
        showWords: false,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200 px-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <span className="text-xl font-bold text-primary">
            Customize Your Meme Coin
          </span>
        </div>
        <div className="flex-none gap-2">
          <button className="btn btn-primary" onClick={onCheckCode}>
            Check Code
          </button>
          <button className="btn" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Code editor */}
        <div className="flex-1 bg-base-100">
          <Editor
            height="calc(100vh - 4rem)"
            defaultLanguage="move"
            language="move"
            value={code}
            onChange={(value) => value && onCodeChange(value)}
            theme="vs-dark"
            onMount={handleEditorDidMount}
          />
        </div>

        {/* Right sidebar - Help */}
        <div className="w-1/4 bg-base-100 border-l border-base-300 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Editing Instructions</h2>
            <div className="prose">
              <p>
                Edit the highlighted sections of the code to customize your meme
                coin implementation.
              </p>
              <ul>
                <li>Only highlighted regions can be edited</li>
                <li>Press Ctrl+Space for suggestions</li>
                <li>Click Check Code to validate your changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .editable-region {
          background: rgba(65, 105, 225, 0.1);
          border-left: 2px solid royalblue;
        }
        .editable-region-glyph {
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="%234169E1" d="M13.5 3h-11a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5zm-.5 9h-10v-8h10v8z"/></svg>') center center no-repeat;
        }
        .editable-region-inline {
          opacity: 1 !important;
        }
        .readonly-region {
          background: rgba(128, 128, 128, 0.05);
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
}
