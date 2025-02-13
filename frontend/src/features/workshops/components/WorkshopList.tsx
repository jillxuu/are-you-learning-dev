import React, { useState, useRef } from "react";
import { Workshop } from "../types/workshop.ts";
import {
  deleteWorkshop,
  exportWorkshop,
  importWorkshop,
  saveWorkshop,
} from "../services/workshopService";

interface Props {
  workshops: Workshop[];
  onWorkshopSelect: (workshop: Workshop) => void;
  onWorkshopCreate: () => void;
  onWorkshopsChange: () => void;
  onWorkshopEdit: (workshop: Workshop) => void;
}

export default function WorkshopList({
  workshops,
  onWorkshopSelect,
  onWorkshopCreate,
  onWorkshopsChange,
  onWorkshopEdit,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredWorkshops = workshops.filter(
    (workshop) =>
      workshop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.author.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleExport = (workshop: Workshop) => {
    const json = exportWorkshop(workshop);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workshop.title.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const workshop = importWorkshop(json);
        saveWorkshop(workshop);
        onWorkshopsChange();
        setImportError(null);
      } catch (error) {
        setImportError(
          error instanceof Error ? error.message : "Failed to import workshop",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = (workshop: Workshop) => {
    if (
      window.confirm(`Are you sure you want to delete "${workshop.title}"?`)
    ) {
      deleteWorkshop(workshop.id);
      onWorkshopsChange();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-200 px-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <span className="text-xl font-bold text-primary">
            Aptos Move Workshops
          </span>
        </div>
        <div className="flex-none gap-2">
          <button className="btn btn-ghost" onClick={handleImportClick}>
            Import
          </button>
          <button className="btn btn-primary" onClick={onWorkshopCreate}>
            Create Workshop
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Search */}
        <div className="form-control w-full max-w-md mx-auto mb-8">
          <input
            type="text"
            placeholder="Search workshops..."
            className="input input-bordered w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Workshop list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkshops.map((workshop) => (
            <div key={workshop.id} className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{workshop.title}</h2>
                <p className="text-sm text-base-content/70">
                  by {workshop.author}
                </p>
                <p className="line-clamp-3">{workshop.description}</p>
                <div className="card-actions justify-end mt-4">
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-sm">
                      •••
                    </label>
                    <ul
                      tabIndex={0}
                      className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li>
                        <button onClick={() => onWorkshopEdit(workshop)}>
                          Edit
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleExport(workshop)}>
                          Export
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleDelete(workshop)}>
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onWorkshopSelect(workshop)}
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hidden file input for import */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleFileSelect}
        />

        {/* Import error toast */}
        {importError && (
          <div className="toast toast-end">
            <div className="alert alert-error">
              <span>{importError}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setImportError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
