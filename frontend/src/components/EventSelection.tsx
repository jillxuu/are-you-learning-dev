import { useState, useEffect } from "react";

interface EventSelectionProps {
  contractAddress: string;
  onEventsSelected: (events: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}

interface Event {
  name: string;
  module: string;
  fields: { name: string; type: string }[];
}

export const EventSelection = ({
  contractAddress,
  onEventsSelected,
  onBack,
  onNext,
}: EventSelectionProps) => {
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://fullnode.devnet.aptoslabs.com/v1/accounts/${contractAddress}/modules`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch contract modules");
        }
        const modules = await response.json();

        // Extract events from all modules
        const events: Event[] = [];
        modules.forEach((module: any) => {
          const structs = module.abi?.structs || [];
          structs.forEach((struct: any) => {
            if (struct.is_event) {
              events.push({
                name: struct.name,
                module: module.abi.name,
                fields: struct.fields.map((field: any) => ({
                  name: field.name,
                  type: field.type,
                })),
              });
            }
          });
        });

        setAvailableEvents(events);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch events");
      } finally {
        setLoading(false);
      }
    };

    if (contractAddress) {
      fetchEvents();
    }
  }, [contractAddress]);

  const handleEventToggle = (event: Event) => {
    setSelectedEvents((prev) => {
      const isSelected = prev.some(
        (e) => e.name === event.name && e.module === event.module,
      );
      if (isSelected) {
        return prev.filter(
          (e) => !(e.name === event.name && e.module === event.module),
        );
      } else {
        return [...prev, event];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedEvents.length === 0) {
      setError("Please select at least one event");
      return;
    }
    onEventsSelected(selectedEvents.map((e) => `${e.module}::${e.name}`));
    onNext();
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="loading loading-spinner loading-lg"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 text-center">
        Select Events to Process
      </h2>
      <p className="text-sm opacity-70 mb-4 text-center">
        Select the events you want to process from the contract at address:
        <br />
        <span className="font-mono text-xs break-all">{contractAddress}</span>
      </p>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {availableEvents.map((event) => (
            <div
              key={`${event.module}::${event.name}`}
              className="card bg-base-200 shadow-xl cursor-pointer hover:bg-base-300"
              onClick={() => handleEventToggle(event)}
            >
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="card-title">{event.name}</h3>
                    <p className="text-sm text-gray-500">
                      Module: {event.module}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedEvents.some(
                      (e) => e.name === event.name && e.module === event.module,
                    )}
                    onChange={() => handleEventToggle(event)}
                  />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-semibold">Fields:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {event.fields.map((field) => (
                      <span
                        key={field.name}
                        className="badge badge-primary"
                        title={field.type}
                      >
                        {field.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <button
          className={`btn btn-primary ${loading ? "loading" : ""}`}
          onClick={handleSubmit}
          disabled={loading || selectedEvents.length === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default EventSelection;
