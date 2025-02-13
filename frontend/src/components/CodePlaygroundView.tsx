import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import ContractDeployment from "./ContractDeployment";

interface Props {
  code: string;
  onCodeChange: (newCode: string) => void;
  onCheckCode: () => void;
  onReset: () => void;
}

interface EditableRegion {
  start: number;
  end: number;
  description: string;
  title: string;
}

interface CompilationError {
  message: string;
  type: "error" | "warning";
}

export default function CodePlaygroundView({
  code,
  onCodeChange,
  onCheckCode,
  onReset,
}: Props) {
  const [editableRegions, setEditableRegions] = useState<EditableRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<EditableRegion | null>(
    null,
  );
  const [isCompiling, setIsCompiling] = useState(false);
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [showDeployment, setShowDeployment] = useState(false);
  const [compilationError, setCompilationError] =
    useState<CompilationError | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    // Parse code to find editable regions marked with special comments
    const lines = code.split("\n");
    const regions: EditableRegion[] = [];
    let currentStart: number | null = null;
    let currentTitle = "";
    let currentDescription = "";

    lines.forEach((line, index) => {
      if (line.includes("// @editable-begin")) {
        currentStart = index + 1;
        // Extract title and description from comment
        const match = line.match(/\/\/ @editable-begin\s*([^-]+)-\s*(.+)/);
        if (match) {
          currentTitle = match[1].trim();
          currentDescription = match[2].trim();
        } else {
          currentTitle = "Editable Section";
          currentDescription = "This section can be modified";
        }
      } else if (line.includes("// @editable-end") && currentStart !== null) {
        regions.push({
          start: currentStart,
          end: index,
          title: currentTitle,
          description: currentDescription,
        });
        currentStart = null;
        currentTitle = "";
        currentDescription = "";
      }
    });

    setEditableRegions(regions);
  }, [code]);

  useEffect(() => {
    if (editorInstance) {
      const model = editorInstance.getModel();
      if (!model) return;

      // Get total lines and validate all line numbers
      const totalLines = model.getLineCount();
      const validatedRegions = editableRegions
        .map((region) => ({
          ...region,
          start: Math.min(Math.max(1, region.start), totalLines),
          end: Math.min(Math.max(1, region.end), totalLines),
        }))
        .filter((region) => region.start <= region.end);

      // Set up decorations for visual feedback
      const editableDecorations = validatedRegions.map((region) => ({
        range: new monaco.Range(
          region.start,
          1,
          region.end,
          model.getLineMaxColumn(region.end),
        ),
        options: {
          isWholeLine: true,
          className: "editable-region",
          glyphMarginClassName: "editable-region-glyph",
          inlineClassName: "editable-region-inline",
        },
      }));

      // Create read-only decorations for non-editable regions
      const readOnlyDecorations = [];
      let lastEnd = 0;

      for (const region of validatedRegions) {
        if (region.start > lastEnd + 1) {
          readOnlyDecorations.push({
            range: new monaco.Range(
              lastEnd + 1,
              1,
              region.start - 1,
              model.getLineMaxColumn(region.start - 1),
            ),
            options: {
              isWholeLine: true,
              className: "readonly-region",
              inlineClassName: "readonly-background",
            },
          });
        }
        lastEnd = region.end;
      }

      // Add final read-only region if needed
      if (lastEnd < totalLines) {
        readOnlyDecorations.push({
          range: new monaco.Range(
            lastEnd + 1,
            1,
            totalLines,
            model.getLineMaxColumn(totalLines),
          ),
          options: {
            isWholeLine: true,
            className: "readonly-region",
            inlineClassName: "readonly-background",
          },
        });
      }

      // Apply all decorations
      const decorations = editorInstance.deltaDecorations(
        [],
        [...editableDecorations, ...readOnlyDecorations],
      );

      // Function to check if a position is in an editable region
      const isPositionEditable = (position: monaco.Position): boolean => {
        return validatedRegions.some(
          (region) =>
            position.lineNumber >= region.start &&
            position.lineNumber <= region.end,
        );
      };

      // Add key event handler
      const keyDownDisposable = editorInstance.onKeyDown(
        (e: monaco.IKeyboardEvent) => {
          const selections = editorInstance.getSelections();
          if (!selections) return;

          // Check if any part of the selection is in a read-only region
          const isEditAllowed = selections.every((selection) => {
            if (!selection) return false;

            // For single cursor position
            if (selection.isEmpty()) {
              return isPositionEditable(selection.getPosition()!);
            }

            // For text selection
            const startLine = selection.startLineNumber;
            const endLine = selection.endLineNumber;

            // Check if the entire selection is within an editable region
            return validatedRegions.some(
              (region) => startLine >= region.start && endLine <= region.end,
            );
          });

          // Block editing keys in read-only regions
          if (!isEditAllowed) {
            const isEditingKey =
              e.keyCode === monaco.KeyCode.Backspace ||
              e.keyCode === monaco.KeyCode.Delete ||
              e.keyCode === monaco.KeyCode.Enter ||
              e.keyCode === monaco.KeyCode.Tab ||
              (e.ctrlKey && e.keyCode === monaco.KeyCode.KeyV) || // Paste
              (!e.ctrlKey &&
                !e.altKey &&
                !e.metaKey &&
                e.keyCode >= monaco.KeyCode.Digit0 &&
                e.keyCode <= monaco.KeyCode.KeyZ);

            if (isEditingKey) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        },
      );

      // Add paste event handler
      const pasteDisposable = editorInstance.onDidPaste(() => {
        const position = editorInstance.getPosition();
        if (position && !isPositionEditable(position)) {
          // Undo the paste operation
          editorInstance.trigger("keyboard", "undo", null);
        }
      });

      return () => {
        keyDownDisposable.dispose();
        pasteDisposable.dispose();
        editorInstance.deltaDecorations(decorations, []);
      };
    }
  }, [editorInstance, editableRegions]);

  // Register Move language and theme before editor mount
  useEffect(() => {
    // Register Move language as an alias for Rust
    monaco.languages.register({ id: "move" });
    monaco.languages.setLanguageConfiguration("move", {
      comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });
  }, []);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
  ) => {
    setEditorInstance(editor);

    // Update editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      lineNumbers: "on",
      renderLineHighlight: "all",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      glyphMargin: true,
      lineDecorationsWidth: 5,
      padding: { top: 8, bottom: 8 },
    });

    // Force a re-render of decorations
    setTimeout(() => {
      const model = editor.getModel();
      if (model) {
        const totalLines = model.getLineCount();
        const validatedRegions = editableRegions
          .map((region) => ({
            ...region,
            start: Math.min(Math.max(1, region.start), totalLines),
            end: Math.min(Math.max(1, region.end), totalLines),
          }))
          .filter((region) => region.start <= region.end);

        const editableDecorations = validatedRegions.map((region) => ({
          range: new monaco.Range(
            region.start,
            1,
            region.end,
            model.getLineMaxColumn(region.end),
          ),
          options: {
            isWholeLine: true,
            className: "editable-region",
            glyphMarginClassName: "editable-region-glyph",
            linesDecorationsClassName: "editable-region-line",
          },
        }));

        editor.deltaDecorations([], editableDecorations);
      }
    }, 100);

    // Add click handler to highlight selected region
    editor.onMouseDown((e) => {
      if (e.target.position) {
        const lineNumber = e.target.position.lineNumber;
        const region = editableRegions.find(
          (r) => lineNumber >= r.start && lineNumber <= r.end,
        );
        setSelectedRegion(region || null);
      }
    });
  };

  const handleCheckCodeClick = async () => {
    if (isCompiling) return;

    setIsCompiling(true);
    setCompilationError(null);

    try {
      onCheckCode();
    } catch (error) {
      setCompilationError({
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        type: "error",
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const scrollToRegion = (region: EditableRegion) => {
    setSelectedRegion(region);
    const element = document.getElementById(`region-${region.start}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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
          <button
            className={`btn btn-primary ${isCompiling ? "loading" : ""}`}
            onClick={handleCheckCodeClick}
            disabled={isCompiling}
          >
            {isCompiling ? "Compiling..." : "Compile"}
          </button>
          <button className="btn btn-ghost" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Error Display */}
      {compilationError && (
        <div
          className={`alert ${compilationError.type === "error" ? "alert-error" : "alert-warning"} shadow-lg mx-4 mt-4`}
        >
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-bold">
                Compilation{" "}
                {compilationError.type === "error" ? "Error" : "Warning"}
              </h3>
              <div className="text-sm whitespace-pre-wrap">
                {compilationError.message}
              </div>
            </div>
          </div>
          <div className="flex-none">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCompilationError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left sidebar - Editable Sections */}
        <div className="w-1/4 bg-base-100 border-r border-base-300 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Editable Sections</h2>
            <div className="space-y-4">
              {editableRegions.map((region, index) => (
                <div
                  key={index}
                  id={`region-${region.start}`}
                  className={`p-4 rounded-lg transition-colors cursor-pointer hover:bg-base-200 ${
                    selectedRegion === region
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-base-200"
                  }`}
                  onClick={() => {
                    setSelectedRegion(region);
                    editorInstance?.revealLineInCenter(region.start);
                  }}
                >
                  <h3 className="font-medium text-primary">{region.title}</h3>
                  <p className="text-sm mt-2">{region.description}</p>
                  <p className="text-xs opacity-70 mt-2">
                    Lines {region.start}-{region.end}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code editor */}
        <div className="flex-1 bg-base-100">
          <Editor
            height="calc(100vh - 4rem)"
            defaultLanguage="rust"
            language="rust"
            value={code}
            onChange={(value) => value && onCodeChange(value)}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              scrollBeyondLastLine: false,
              minimap: { enabled: true },
              glyphMargin: true,
              lineDecorationsWidth: 5,
              renderLineHighlight: "all",
              lineNumbers: "on",
              fontSize: 14,
            }}
          />
        </div>

        {/* Right sidebar - Help */}
        <div className="w-1/4 bg-base-100 border-l border-base-300 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Instructions</h2>
            <div className="prose">
              <p>
                Learn how to customize your meme coin by modifying the
                highlighted sections:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm mt-4">
                <li>
                  Click on a section in the left sidebar to navigate to it
                </li>
                <li>Only highlighted sections can be modified</li>
                <li>Press Ctrl+Space for code suggestions</li>
                <li>
                  Click Compile to validate your changes - you'll need a private
                  key for this step
                </li>
                <li>
                  After successful compilation, you can deploy your contract to
                  a network of your choice
                </li>
                <li>Click Reset to restore the original code</li>
              </ul>

              {selectedRegion && (
                <div className="mt-8">
                  <h3 className="font-bold">
                    Selected Section: {selectedRegion.title}
                  </h3>
                  <p className="text-sm mt-2">{selectedRegion.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Modal */}
      {showDeployment && (
        <ContractDeployment
          onDeploy={() => {}}
          onCancel={() => setShowDeployment(false)}
          currentCode={code}
          packageName="meme_factory"
          privateKey={privateKey || ""}
        />
      )}
    </div>
  );
}
