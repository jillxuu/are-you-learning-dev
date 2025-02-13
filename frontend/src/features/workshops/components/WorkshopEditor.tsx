import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor, { OnMount } from "@monaco-editor/react";
import { Workshop, WorkshopStep, LineDescription } from "../types/workshop.ts";
import { parseLineNumbers } from "../utils/lineUtils";
import { StepImageSection } from "./WorkshopEditor/StepImageSection";
import { LineDescriptionImageSection } from "./WorkshopEditor/LineDescriptionImageSection";
import {
  configureMonaco,
  DEFAULT_EDITOR_OPTIONS,
  createLineDescriptionDecorations,
} from "../utils/monacoConfig";
import * as monaco from "monaco-editor";
import { Network } from "@aptos-labs/ts-sdk";

interface Props {
  workshop?: Workshop;
  onSave: (workshop: Workshop) => void;
}

export default function WorkshopEditor({
  workshop: initialWorkshop,
  onSave,
}: Props) {
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<Workshop>(() => {
    const newWorkshop = initialWorkshop || {
      id: crypto.randomUUID(),
      title: "New Workshop",
      description: "Workshop description",
      author: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
    };

    // Update URL with workshop ID if it's a new workshop
    if (!initialWorkshop) {
      navigate(`/workshops/${newWorkshop.id}/edit`, { replace: true });
    }

    return newWorkshop;
  });

  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(-1);
  const [activeDescription, setActiveDescription] = useState<{
    content: string;
    position: { top: number; left: number };
  } | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aptosNetwork, setAptosNetwork] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [showContractForm, setShowContractForm] = useState(false);

  const handleSelectStep = (index: number) => {
    // Force a clean state by explicitly setting undefined first
    setSelectedStepIndex(-1);
    setTimeout(() => {
      setSelectedStepIndex(index);
    }, 0);
  };

  const handleAddStep = () => {
    const newStep: WorkshopStep = {
      id: crypto.randomUUID(),
      title: `Step ${workshop.steps.length + 1}`,
      description: "Step description",
      sourceCode: "",
      lineDescriptions: [],
      diffWithPreviousStep: false,
      mainImage: undefined,
    };

    setWorkshop((prev) => {
      const updatedWorkshop = {
        ...prev,
        steps: [...prev.steps, { ...newStep }],
        updatedAt: Date.now(),
      };
      return updatedWorkshop;
    });

    // Use the new handleSelectStep function
    handleSelectStep(workshop.steps.length);
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
    setIsModalOpen(true);
    setShowContractForm(false); // Reset the form view state
  };

  const handleModalSubmit = () => {
    const updatedWorkshop = {
      ...workshop,
      ...(aptosNetwork && contractAddress
        ? {
            aptosNetwork: aptosNetwork as Network,
            contractAddress,
          }
        : {}),
    };
    setWorkshop(updatedWorkshop);
    setIsModalOpen(false);
    setShowContractForm(false);
    onSave(updatedWorkshop);
    // Navigate to the workshop edit page after saving
    navigate(`/workshops/${updatedWorkshop.id}/edit`, { replace: true });
  };

  const handleDirectSave = () => {
    setIsModalOpen(false);
    onSave(workshop);
    // Navigate to the workshop edit page after saving
    navigate(`/workshops/${workshop.id}/edit`, { replace: true });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    updateEditorDecorations();

    // Add hover listener for line descriptions
    editor.onMouseMove((e: monaco.editor.IEditorMouseEvent) => {
      const position = e.target.position;
      if (!position) return;

      const lineNumber = position.lineNumber;
      const description = workshop.steps[
        selectedStepIndex
      ].lineDescriptions.find((desc) => desc.lines.includes(lineNumber));

      if (description) {
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

  const updateEditorDecorations = () => {
    const editor = editorRef.current;
    if (!editor || !workshop.steps[selectedStepIndex]) return;

    const model = editor.getModel();
    if (!model) return;

    // Clear existing decorations using the stored IDs
    if (decorationsRef.current.length > 0) {
      model.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }

    // Create new decorations
    const decorations = createLineDescriptionDecorations(
      workshop.steps[selectedStepIndex].lineDescriptions,
    );
    decorationsRef.current = model.deltaDecorations([], decorations);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200 px-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1 gap-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigate("/");
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Workshops
          </button>
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
                  onClick={() => handleSelectStep(index)}
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
                    beforeMount={configureMonaco}
                    options={DEFAULT_EDITOR_OPTIONS}
                    onMount={handleEditorDidMount}
                  />
                </div>
              </div>

              {/* Add Step Images Section */}
              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Step Images</span>
                </label>
                <StepImageSection
                  mainImage={workshop.steps[selectedStepIndex].mainImage}
                  onMainImageChange={(image) => {
                    handleUpdateStep(selectedStepIndex, { mainImage: image });
                  }}
                  className="mb-4"
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
                        {/* Add Line Description Image Section */}
                        <div className="form-control w-full mt-2">
                          <label className="label">
                            <span className="label-text">
                              Description Image
                            </span>
                          </label>
                          <LineDescriptionImageSection
                            lineDescription={desc}
                            onImageChange={(image) => {
                              const updatedDescriptions = [
                                ...workshop.steps[selectedStepIndex]
                                  .lineDescriptions,
                              ];
                              updatedDescriptions[index] = {
                                ...desc,
                                image,
                              };
                              handleUpdateStep(selectedStepIndex, {
                                lineDescriptions: updatedDescriptions,
                              });
                            }}
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
      </div>

      {/* Replace the Modal component with DaisyUI modal */}
      <dialog
        id="contract_modal"
        className={`modal ${isModalOpen ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <form method="dialog">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
          </form>

          {!showContractForm ? (
            <>
              <h3 className="font-bold text-lg mb-6">
                Would you like to add contract deployment details?
              </h3>
              <p className="text-sm mb-6">
                This will allow learners to be redirected to the deployed
                contract after completing the workshop.
              </p>
              <div className="modal-action">
                <form method="dialog">
                  <button
                    className="btn btn-ghost mr-2"
                    onClick={handleDirectSave}
                  >
                    No, Save Without Contract
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowContractForm(true)}
                  >
                    Yes, Add Contract Details
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg mb-6">
                Add Contract Deployment Details
              </h3>
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Aptos Network
                    </span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={aptosNetwork}
                    onChange={(e) => setAptosNetwork(e.target.value)}
                  >
                    <option value="">Select Network</option>
                    <option value={Network.DEVNET}>Devnet</option>
                    <option value={Network.TESTNET}>Testnet</option>
                    <option value={Network.MAINNET}>Mainnet</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Contract Address
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="Enter Contract Address (0x...)"
                  />
                </div>
              </div>

              <div className="modal-action">
                <form method="dialog">
                  <button
                    className="btn btn-ghost mr-2"
                    onClick={() => setShowContractForm(false)}
                  >
                    Back
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleModalSubmit}
                    disabled={!aptosNetwork || !contractAddress}
                  >
                    Save
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsModalOpen(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
