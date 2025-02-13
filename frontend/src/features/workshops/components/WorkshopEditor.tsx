import { useState } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Workshop, WorkshopStep, LineDescription } from "../types/workshop.ts";
import { parseLineNumbers } from "../utils/lineUtils";

interface Props {
  workshop?: Workshop;
  onSave: (workshop: Workshop) => void;
}

export default function WorkshopEditor({
  workshop: initialWorkshop,
  onSave,
}: Props) {
  const [workshop, setWorkshop] = useState<Workshop>(
    () =>
      initialWorkshop || {
        id: crypto.randomUUID(),
        title: "New Workshop",
        description: "Workshop description",
        author: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        steps: [],
      },
  );

  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(-1);
  const [previewMode, setPreviewMode] = useState(false);

  const handleAddStep = () => {
    const newStep: WorkshopStep = {
      id: crypto.randomUUID(),
      title: `Step ${workshop.steps.length + 1}`,
      description: "Step description",
      sourceCode: "",
      highlightedLines: [],
      lineDescriptions: [],
      diffWithPreviousStep: false,
    };

    setWorkshop((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: Date.now(),
    }));
    setSelectedStepIndex(workshop.steps.length);
  };

  const handleUpdateStep = (
    stepIndex: number,
    updates: Partial<WorkshopStep>,
  ) => {
    setWorkshop((prev) => ({
      ...prev,
      steps: prev.steps.map((step, index) =>
        index === stepIndex ? { ...step, ...updates } : step,
      ),
      updatedAt: Date.now(),
    }));
  };

  const handleDeleteStep = (stepIndex: number) => {
    setWorkshop((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex),
      updatedAt: Date.now(),
    }));
    setSelectedStepIndex(-1);
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workshop.steps.length) return;

    setWorkshop((prev) => {
      const steps = [...prev.steps];
      const [removed] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, removed);
      return { ...prev, steps, updatedAt: Date.now() };
    });
    setSelectedStepIndex(toIndex);
  };

  const handleSave = () => {
    onSave(workshop);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200 px-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <input
            type="text"
            className="input input-ghost text-xl font-bold"
            value={workshop.title}
            onChange={(e) =>
              setWorkshop((prev) => ({
                ...prev,
                title: e.target.value,
                updatedAt: Date.now(),
              }))
            }
            placeholder="Workshop Title"
          />
        </div>
        <div className="flex-none gap-2">
          <button
            className={`btn ${previewMode ? "btn-primary" : ""}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? "Edit" : "Preview"}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Workshop
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left sidebar - Steps */}
        <div className="w-1/4 bg-base-100 border-r border-base-300 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Steps</h2>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleAddStep}
              >
                Add Step
              </button>
            </div>
            <div className="space-y-2">
              {workshop.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg transition-colors cursor-pointer hover:bg-base-200 ${
                    selectedStepIndex === index
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-base-200"
                  }`}
                  onClick={() => setSelectedStepIndex(index)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{step.title}</h3>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(index, index - 1);
                        }}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(index, index + 1);
                        }}
                        disabled={index === workshop.steps.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStep(index);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-base-100">
          {selectedStepIndex === -1 ? (
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Workshop Details</h2>
              <div className="form-control w-full max-w-md">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  value={workshop.description}
                  onChange={(e) =>
                    setWorkshop((prev) => ({
                      ...prev,
                      description: e.target.value,
                      updatedAt: Date.now(),
                    }))
                  }
                  placeholder="Workshop description (supports markdown)"
                />
              </div>
              <div className="form-control w-full max-w-md mt-4">
                <label className="label">
                  <span className="label-text">Author</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={workshop.author}
                  onChange={(e) =>
                    setWorkshop((prev) => ({
                      ...prev,
                      author: e.target.value,
                      updatedAt: Date.now(),
                    }))
                  }
                  placeholder="Your name"
                />
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Step Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={workshop.steps[selectedStepIndex].title}
                  onChange={(e) =>
                    handleUpdateStep(selectedStepIndex, {
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  value={workshop.steps[selectedStepIndex].description}
                  onChange={(e) =>
                    handleUpdateStep(selectedStepIndex, {
                      description: e.target.value,
                    })
                  }
                  placeholder="Step description (supports markdown)"
                />
              </div>

              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Source Code</span>
                </label>
                <div className="h-96 border rounded-lg overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage="move"
                    language="move"
                    value={workshop.steps[selectedStepIndex].sourceCode}
                    onChange={(value) =>
                      value &&
                      handleUpdateStep(selectedStepIndex, { sourceCode: value })
                    }
                    theme="move-dark"
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
                  />
                </div>
              </div>

              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Highlighted Lines</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  defaultValue={workshop.steps[
                    selectedStepIndex
                  ].highlightedLines.join(", ")}
                  onChange={(e) => {
                    const lines = parseLineNumbers(e.target.value);
                    handleUpdateStep(selectedStepIndex, {
                      highlightedLines: lines,
                    });
                  }}
                  placeholder="Example: 1, 3, 5-10"
                />
              </div>

              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Line Descriptions</span>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const newDescription: LineDescription = {
                        lines: [],
                        content: "",
                      };
                      handleUpdateStep(selectedStepIndex, {
                        lineDescriptions: [
                          ...(workshop.steps[selectedStepIndex]
                            .lineDescriptions || []),
                          newDescription,
                        ],
                      });
                    }}
                  >
                    Add Description
                  </button>
                </label>
                <div className="space-y-4">
                  {(
                    workshop.steps[selectedStepIndex].lineDescriptions || []
                  ).map((desc, index) => (
                    <div key={index} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start">
                          <div className="form-control flex-1 mr-4">
                            <label className="label">
                              <span className="label-text">Lines</span>
                            </label>
                            <input
                              type="text"
                              className="input input-bordered"
                              defaultValue={desc.lines.join(", ")}
                              onChange={(e) => {
                                const lines = parseLineNumbers(e.target.value);
                                const updatedDescriptions = [
                                  ...workshop.steps[selectedStepIndex]
                                    .lineDescriptions,
                                ];
                                updatedDescriptions[index] = { ...desc, lines };
                                handleUpdateStep(selectedStepIndex, {
                                  lineDescriptions: updatedDescriptions,
                                });
                              }}
                              placeholder="Example: 1, 3, 5-10"
                            />
                          </div>
                          <button
                            className="btn btn-sm btn-ghost btn-square text-error"
                            onClick={() => {
                              const updatedDescriptions = workshop.steps[
                                selectedStepIndex
                              ].lineDescriptions.filter((_, i) => i !== index);
                              handleUpdateStep(selectedStepIndex, {
                                lineDescriptions: updatedDescriptions,
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="form-control w-full mt-2">
                          <label className="label">
                            <span className="label-text">
                              Description (Markdown)
                            </span>
                          </label>
                          <textarea
                            className="textarea textarea-bordered h-24"
                            value={desc.content}
                            onChange={(e) => {
                              const updatedDescriptions = [
                                ...workshop.steps[selectedStepIndex]
                                  .lineDescriptions,
                              ];
                              updatedDescriptions[index] = {
                                ...desc,
                                content: e.target.value,
                              };
                              handleUpdateStep(selectedStepIndex, {
                                lineDescriptions: updatedDescriptions,
                              });
                            }}
                            placeholder="Describe these lines..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">
                    Show Diff with Previous Step
                  </span>
                  <input
                    type="checkbox"
                    className="toggle"
                    checked={
                      workshop.steps[selectedStepIndex].diffWithPreviousStep
                    }
                    onChange={(e) =>
                      handleUpdateStep(selectedStepIndex, {
                        diffWithPreviousStep: e.target.checked,
                      })
                    }
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Preview */}
        {previewMode && (
          <div className="w-1/3 bg-base-100 border-l border-base-300 sticky top-16 h-[calc(100vh-4rem)]">
            <div className="p-4 h-full overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Preview</h2>
              {selectedStepIndex === -1 ? (
                <div className="prose">
                  <h1>{workshop.title}</h1>
                  <p className="text-sm text-base-content/70">
                    by {workshop.author}
                  </p>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {workshop.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="prose">
                  <h2>{workshop.steps[selectedStepIndex].title}</h2>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {workshop.steps[selectedStepIndex].description}
                  </ReactMarkdown>
                  <div className="not-prose">
                    <Editor
                      height="300px"
                      defaultLanguage="move"
                      language="move"
                      value={workshop.steps[selectedStepIndex].sourceCode}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
