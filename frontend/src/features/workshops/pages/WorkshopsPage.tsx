import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WorkshopList from "../components/WorkshopList";
import WorkshopEditor from "../components/WorkshopEditor";
import WorkshopViewer from "../components/WorkshopViewer";
import { Workshop } from "../types/workshop";
import {
  getWorkshops,
  getWorkshopById,
  saveWorkshop,
} from "../services/workshopService";

type Mode = "list" | "edit" | "view";

export default function WorkshopsPage() {
  const [mode, setMode] = useState<Mode>("list");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
  );
  const navigate = useNavigate();
  const { workshopId } = useParams<{ workshopId?: string }>();

  useEffect(() => {
    loadWorkshops();
  }, []);

  useEffect(() => {
    if (workshopId) {
      const workshop = getWorkshopById(workshopId);
      if (workshop) {
        setSelectedWorkshop(workshop);
        if (window.location.pathname.endsWith("/edit")) {
          setMode("edit");
        } else {
          setMode("view");
        }
      } else {
        navigate("/workshops");
      }
    }
  }, [workshopId, navigate]);

  useEffect(() => {
    if (window.location.pathname === "/") {
      navigate("/workshops");
    }
  }, [navigate]);

  const loadWorkshops = () => {
    const loadedWorkshops = getWorkshops();
    setWorkshops(loadedWorkshops);
  };

  const handleWorkshopSelect = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setMode("view");
    navigate(`/workshops/${workshop.id}`);
  };

  const handleWorkshopCreate = () => {
    setSelectedWorkshop(null);
    setMode("edit");
    const newWorkshopId = crypto.randomUUID();
    navigate(`/workshops/${newWorkshopId}/edit`);
  };

  const handleWorkshopSave = (workshop: Workshop) => {
    saveWorkshop(workshop);
    loadWorkshops();
    setMode("list");
    navigate("/workshops");
  };

  const handleWorkshopComplete = () => {
    setMode("list");
    navigate("/workshops");
  };

  const handleWorkshopEdit = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setMode("edit");
    navigate(`/workshops/${workshop.id}/edit`);
  };

  const renderContent = () => {
    switch (mode) {
      case "list":
        return (
          <WorkshopList
            workshops={workshops}
            onWorkshopSelect={handleWorkshopSelect}
            onWorkshopCreate={handleWorkshopCreate}
            onWorkshopsChange={loadWorkshops}
            onWorkshopEdit={handleWorkshopEdit}
          />
        );
      case "edit":
        return (
          <WorkshopEditor
            workshop={selectedWorkshop || undefined}
            onSave={handleWorkshopSave}
          />
        );
      case "view":
        return selectedWorkshop ? (
          <WorkshopViewer
            workshop={selectedWorkshop}
            onComplete={handleWorkshopComplete}
          />
        ) : null;
    }
  };

  return <div className="bg-base-100">{renderContent()}</div>;
}
