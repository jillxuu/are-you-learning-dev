import { useState, useRef } from "react";
import Editor, {
  DiffEditor,
  OnMount,
  DiffOnMount,
  BeforeMount,
} from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Workshop } from "../types/workshop.ts";
import { generateWorkshopUrl } from "../services/workshopService";

interface Props {
  workshop: Workshop;
  onComplete?: () => void;
}

interface RegularEditorProps {
  sourceCode: string;
  onMount: OnMount;
  beforeMount: BeforeMount;
  options: monaco.editor.IStandaloneEditorConstructionOptions;
}

interface CodeDiffEditorProps {
  originalCode: string;
  modifiedCode: string;
  onMount: DiffOnMount;
  beforeMount: BeforeMount;
  options: monaco.editor.IStandaloneEditorConstructionOptions;
}

interface DescriptionPopupProps {
  content: string;
  position: { top: number; left: number };
  onClose: () => void;
}

const RegularEditor = ({
  sourceCode,
  onMount,
  beforeMount,
  options,
}: RegularEditorProps) => (
  <Editor
    value={sourceCode}
    height="100%"
    defaultLanguage="move"
    language="move"
    theme="move-dark"
    onMount={onMount}
    beforeMount={beforeMount}
    options={options}
  />
);

const CodeDiffEditor = ({
  originalCode,
  modifiedCode,
  onMount,
  beforeMount,
  options,
}: CodeDiffEditorProps) => (
  <DiffEditor
    original={originalCode}
    modified={modifiedCode}
    height="100%"
    language="move"
    theme="move-dark"
    onMount={onMount}
    beforeMount={beforeMount}
    options={{
      ...options,
      renderSideBySide: true,
      enableSplitViewResizing: true,
      originalEditable: false,
      readOnly: true,
    }}
  />
);

const DescriptionPopup = ({
  content,
  position,
  onClose,
}: DescriptionPopupProps) => (
  <div
    className="fixed z-50 max-w-md"
    style={{
      top: `${position.top}px`,
      left: `${position.left}px`,
      transform: "translate(-50%, -100%)",
    }}
  >
    <div className="bg-base-200 rounded-lg shadow-xl p-4 prose prose-sm max-w-none">
      <button
        className="absolute top-2 right-2 btn btn-ghost btn-xs"
        onClick={onClose}
      >
        ×
      </button>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  </div>
);

export default function WorkshopViewer({ workshop, onComplete }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [activeDescription, setActiveDescription] = useState<{
    content: string;
    position: { top: number; left: number };
  } | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const currentStep = workshop.steps[currentStepIndex];
  const previousStep =
    currentStepIndex > 0 ? workshop.steps[currentStepIndex - 1] : null;
  const isLastStep = currentStepIndex === workshop.steps.length - 1;

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    updateEditorDecorations();

    // Add hover listener for line descriptions
    editor.onMouseMove((e) => {
      const position = e.target.position;
      if (!position) return;

      const lineNumber = position.lineNumber;
      const description = currentStep.lineDescriptions.find((desc) =>
        desc.lines.includes(lineNumber),
      );

      if (description) {
        const lineHeight = editor.getOption(
          monaco.editor.EditorOption.lineHeight,
        );
        const editorPos = editor.getContainerDomNode().getBoundingClientRect();
        const linePos = editor.getScrolledVisiblePosition(position);

        if (linePos) {
          setActiveDescription({
            content: description.content,
            position: {
              top: editorPos.top + linePos.top - 10,
              left: editorPos.left + linePos.left,
            },
          });
        }
      } else {
        setActiveDescription(null);
      }
    });

    editor.onMouseLeave(() => {
      setActiveDescription(null);
    });
  };

  const handleDiffEditorDidMount: DiffOnMount = (diffEditor) => {
    // We don't need decorations in diff view
  };

  const updateEditorDecorations = () => {
    const editor = editorRef.current;
    if (!editor || !currentStep) return;

    const model = editor.getModel();
    if (!model) return;

    // Clear existing decorations using the stored IDs
    if (decorationsRef.current.length > 0) {
      model.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }

    // Add highlighted line decorations
    const highlightDecorations = currentStep.highlightedLines.map(
      (lineNumber) => ({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "bg-primary bg-opacity-20",
          overviewRuler: {
            color: "rgb(147, 51, 234)",
            position: monaco.editor.OverviewRulerLane.Center,
          },
          minimap: {
            color: "rgb(147, 51, 234)",
            position: monaco.editor.MinimapPosition.Inline,
          },
        },
      }),
    );

    // Apply the highlight decorations and store the IDs
    decorationsRef.current = model.deltaDecorations([], highlightDecorations);
  };

  const handleNextStep = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleShareClick = () => {
    const url = generateWorkshopUrl(workshop.id);
    navigator.clipboard.writeText(url);
  };

  // Force editor remount when step changes
  const editorKey = `editor-${currentStepIndex}`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200 px-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <span className="text-xl font-bold text-primary">
            {workshop.title}
          </span>
        </div>
        <div className="flex-none gap-2">
          <button className="btn btn-ghost" onClick={handleShareClick}>
            Share
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left sidebar - Steps */}
        <div className="w-1/4 bg-base-100 border-r border-base-300 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Steps</h2>
            <div className="space-y-2">
              {workshop.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg transition-colors cursor-pointer hover:bg-base-200 ${
                    currentStepIndex === index
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-base-200"
                  }`}
                  onClick={() => setCurrentStepIndex(index)}
                >
                  <h3 className="font-medium">{step.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-base-100 overflow-y-auto">
          <div className="p-4">
            <div className="prose max-w-none mb-4">
              <h2>{currentStep.title}</h2>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentStep.description}
              </ReactMarkdown>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 h-[60vh] border rounded-lg overflow-hidden">
                {currentStep.diffWithPreviousStep &&
                previousStep &&
                showDiff ? (
                  <CodeDiffEditor
                    key={`diff-${editorKey}`}
                    originalCode={previousStep.sourceCode}
                    modifiedCode={currentStep.sourceCode}
                    onMount={handleDiffEditorDidMount}
                    beforeMount={(monaco) => {
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
                    }}
                    options={{
                      readOnly: true,
                      minimap: { enabled: true },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      tabSize: 4,
                      occurrencesHighlight: "singleFile",
                      glyphMargin: true,
                      renderLineHighlight: "none",
                      lineDecorationsWidth: 5,
                    }}
                  />
                ) : (
                  <RegularEditor
                    key={`regular-${editorKey}`}
                    sourceCode={currentStep.sourceCode}
                    onMount={handleEditorDidMount}
                    beforeMount={(monaco) => {
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
                    }}
                    options={{
                      readOnly: true,
                      minimap: { enabled: true },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      tabSize: 4,
                      occurrencesHighlight: "singleFile",
                      glyphMargin: true,
                      renderLineHighlight: "none",
                      lineDecorationsWidth: 5,
                    }}
                  />
                )}
              </div>

              {/* Line descriptions panel */}
              <div className="w-1/3 h-[60vh] border rounded-lg overflow-y-auto bg-base-200 p-4">
                <h3 className="font-bold mb-4">Line Descriptions</h3>
                <div className="space-y-4">
                  {currentStep.lineDescriptions.map((desc, index) => (
                    <div
                      key={index}
                      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="card-body p-4">
                        <div className="text-sm font-medium text-primary mb-2">
                          Lines: {desc.lines.join(", ")}
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {desc.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                className="btn"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
              >
                Previous
              </button>
              <div className="flex gap-2">
                {currentStep.diffWithPreviousStep && previousStep && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowDiff(!showDiff)}
                  >
                    {showDiff ? "Hide Changes" : "Show Changes"}
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleNextStep}>
                  {isLastStep ? "Complete" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description popup */}
      {activeDescription && (
        <DescriptionPopup
          content={activeDescription.content}
          position={activeDescription.position}
          onClose={() => setActiveDescription(null)}
        />
      )}
    </div>
  );
}
