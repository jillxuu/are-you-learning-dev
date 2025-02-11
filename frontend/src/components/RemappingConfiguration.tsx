import { useState, useEffect } from 'react';

interface RemappingConfigurationProps {
  selectedEvents: string[];
  onConfigurationComplete: (config: any) => void;
  onBack: () => void;
  onNext: () => void;
  contractAddress: string;
}

interface FieldConfig {
  sourceField: string;
  targetField: string;
  type: string;
  table: string;
  isIndex: boolean;
  isPrimaryKey: boolean;
}

interface EventMapping {
  eventName: string;
  fields: FieldConfig[];
}

interface EventField {
  name: string;
  type: string;
}

export const RemappingConfiguration = ({ 
  selectedEvents, 
  onConfigurationComplete, 
  onBack, 
  onNext, 
  contractAddress 
}: RemappingConfigurationProps) => {
  const [mappings, setMappings] = useState<EventMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<string>(selectedEvents[0] || '');
  const [eventFields, setEventFields] = useState<Record<string, EventField[]>>({});

  // Fetch event fields for each selected event
  useEffect(() => {
    const fetchEventFields = async () => {
      setLoading(true);
      setError(null);
      const newEventFields: Record<string, EventField[]> = {};
      
      try {
        // Get the contract address from props
        const response = await fetch(`https://fullnode.devnet.aptoslabs.com/v1/accounts/${contractAddress}/modules`);
        if (!response.ok) {
          throw new Error('Failed to fetch contract modules');
        }
        const modules = await response.json();
        
        // Process each selected event
        selectedEvents.forEach(eventFullName => {
          const [moduleName, eventName] = eventFullName.split('::');
          
          // Find the module and event
          const module = modules.find((m: any) => m.abi?.name === moduleName);
          if (module) {
            const eventStruct = module.abi.structs.find((s: any) => s.name === eventName && s.is_event);
            if (eventStruct) {
              newEventFields[eventFullName] = eventStruct.fields.map((f: any) => ({
                name: f.name,
                type: f.type
              }));
            }
          }
        });

        setEventFields(newEventFields);
        
        // Initialize mappings with the fetched fields
        const initialMappings = selectedEvents.map(event => ({
          eventName: event,
          fields: newEventFields[event]?.map(field => ({
            sourceField: field.name,
            targetField: field.name.toLowerCase(),
            type: field.type,
            table: 'events',
            isIndex: true,
            isPrimaryKey: false
          })) || []
        }));
        setMappings(initialMappings);
      } catch (err) {
        console.error('Error fetching event fields:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch event fields');
      } finally {
        setLoading(false);
      }
    };

    if (selectedEvents.length > 0) {
      fetchEventFields();
    }
  }, [selectedEvents, contractAddress]);

  const handleAddField = (eventName: string) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.eventName === eventName) {
        return {
          ...mapping,
          fields: [...mapping.fields, { sourceField: '', targetField: '', type: '', table: 'events', isIndex: true, isPrimaryKey: false }]
        };
      }
      return mapping;
    }));
  };

  const handleRemoveField = (eventName: string, index: number) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.eventName === eventName) {
        const newFields = [...mapping.fields];
        newFields.splice(index, 1);
        return {
          ...mapping,
          fields: newFields
        };
      }
      return mapping;
    }));
  };

  const handleFieldChange = (
    eventName: string,
    index: number,
    field: keyof FieldConfig,
    value: string | boolean
  ) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.eventName === eventName) {
        const newFields = [...mapping.fields];
        newFields[index] = {
          ...newFields[index],
          [field]: value
        };
        return {
          ...mapping,
          fields: newFields
        };
      }
      return mapping;
    }));
  };

  const handleSubmit = () => {
    // Validate that all fields are filled
    const hasEmptyFields = mappings.some(mapping => 
      mapping.fields.some(field => 
        !field.sourceField || !field.targetField
      )
    );

    if (hasEmptyFields) {
      setError('Please fill in all field mappings');
      return;
    }

    // Convert mappings to the format expected by the API
    const config = {
      events: mappings.reduce((acc, mapping) => {
        acc[mapping.eventName] = {
          event_fields: mapping.fields.reduce((fieldAcc, field) => {
            const fieldPath = `$.${field.sourceField}`;
            fieldAcc[fieldPath] = [{
              table: field.table || 'events',
              column: field.targetField,
              is_vec: false,
              is_index: field.isIndex,
              move_type: field.type,
              is_optional: false,
              is_primary_key: field.isPrimaryKey,
              default_value: null
            }];
            return fieldAcc;
          }, {} as Record<string, any[]>),
          event_metadata: null
        };
        return acc;
      }, {} as Record<string, any>),
      transaction_metadata: {
        version: [{
          table: 'events',
          column: 'txn_version',
          is_index: true,
          is_primary_key: false
        }],
        timestamp: [{
          table: 'events',
          column: 'created_at_timestamp',
          is_index: true,
          is_primary_key: false
        }],
        block_height: [],
        epoch: []
      }
    };

    onConfigurationComplete(config);
    onNext();
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="loading loading-spinner loading-lg"></div>
        <p>Loading event fields...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4">Configure Event Mappings</h2>
      
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Source Field</th>
                  <th>Target Field</th>
                  <th>Transformation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(mapping => (
                  <tr key={mapping.eventName}>
                    <td>{mapping.eventName}</td>
                      <td>
                      {mapping.fields.map((field, index) => (
                        <div key={index} className="flex gap-4 items-start mb-4">
                          <div className="form-control flex-1">
                        <select
                            className="select select-bordered w-full"
                          value={field.sourceField}
                          onChange={(e) => handleFieldChange(
                            mapping.eventName,
                            index,
                            'sourceField',
                            e.target.value
                          )}
                        >
                          <option value="">Select field</option>
                          {eventFields[mapping.eventName]?.map(f => (
                            <option key={f.name} value={f.name} title={f.type}>
                              {f.name} ({f.type})
                            </option>
                          ))}
                        </select>
                        </div>
                        </div>
                      ))}
                      </td>
                      <td>
                      {mapping.fields.map((field, index) => (
                        <div key={index} className="flex gap-4 items-start mb-4">
                          <div className="form-control flex-1">
                        <input
                          type="text"
                            className="input input-bordered w-full"
                          value={field.targetField}
                          onChange={(e) => handleFieldChange(
                            mapping.eventName,
                            index,
                            'targetField',
                            e.target.value
                          )}
                          placeholder="e.g. token_amount"
                        />
                        </div>
                        </div>
                      ))}
                      </td>
                      <td>
                      {mapping.fields.map((field, index) => (
                        <div key={index} className="flex gap-4 items-start mb-4">
                          <div className="form-control flex-1">
                        <input
                          type="text"
                            className="input input-bordered w-full"
                          value={field.table}
                          onChange={(e) => handleFieldChange(
                            mapping.eventName,
                            index,
                            'table',
                            e.target.value
                          )}
                          placeholder="e.g. events"
                        />
                        </div>
                        </div>
                      ))}
                      </td>
                      <td>
                      {mapping.fields.map((field, index) => (
                        <div key={index} className="flex gap-4 items-start mb-4">
                          <div className="form-control">
                        <select
                            className="select select-bordered w-full"
                          value={field.type}
                          onChange={(e) => handleFieldChange(
                            mapping.eventName,
                            index,
                            'type',
                            e.target.value
                          )}
                        >
                          <option value="String">String</option>
                          <option value="U64">U64</option>
                          <option value="U128">U128</option>
                          <option value="Address">Address</option>
                          <option value="Bool">Bool</option>
                          <option value="Vector">Vector</option>
                        </select>
                        </div>
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <span className="label-text mr-2">Index</span>
                            <input
                              type="checkbox"
                                className="checkbox"
                              checked={field.isIndex}
                              onChange={(e) => handleFieldChange(
                                mapping.eventName,
                                index,
                                'isIndex',
                                e.target.checked
                              )}
                            />
                          </label>
                          </div>
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <span className="label-text mr-2">Primary Key</span>
                            <input
                              type="checkbox"
                                className="checkbox"
                              checked={field.isPrimaryKey}
                              onChange={(e) => handleFieldChange(
                                mapping.eventName,
                                index,
                                'isPrimaryKey',
                                e.target.checked
                              )}
                            />
                          </label>

                        </div>
                        </div>
                      ))}
                      </td>
                      <td>
                          <button
                        className="btn btn-square btn-error"
                          onClick={() => handleRemoveField(mapping.eventName, 0)}
                          >
                            ×
                          </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button className="btn" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Next</button>
      </div>
    </div>
  );
};

export default RemappingConfiguration; 