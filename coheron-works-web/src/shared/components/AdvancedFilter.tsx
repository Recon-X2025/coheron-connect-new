import React, { useState } from 'react';
import { X, Plus, Filter, Save } from 'lucide-react';
import './AdvancedFilter.css';

export interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

export interface SavedFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
}

interface AdvancedFilterProps {
  fields: Array<{ name: string; label: string; type: 'string' | 'number' | 'date' | 'boolean' | 'selection' }>;
  onFilterChange: (domain: any[]) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: SavedFilter) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  fields,
  onFilterChange,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [filterName, setFilterName] = useState('');

  const operators = {
    string: ['=', '!=', 'ilike', 'not ilike', 'in', 'not in'],
    number: ['=', '!=', '>', '<', '>=', '<='],
    date: ['=', '!=', '>', '<', '>=', '<=', 'between'],
    boolean: ['=', '!='],
    selection: ['=', '!=', 'in', 'not in'],
  };

  const addCondition = () => {
    if (fields.length > 0) {
      setConditions([
        ...conditions,
        {
          field: fields[0].name,
          operator: operators[fields[0].type][0],
          value: '',
        },
      ]);
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    setConditions(updated);
  };

  const applyFilter = () => {
    const domain: any[] = [];
    
    conditions.forEach((condition) => {
      if (condition.value !== '' && condition.value !== null) {
        const field = fields.find((f) => f.name === condition.field);
        if (field) {
          let value: any = condition.value;

          // Convert value based on field type
          if (field.type === 'number') {
            value = parseFloat(value);
          } else if (field.type === 'boolean') {
            value = value === 'true' || value === true;
          } else if (field.type === 'date' && condition.operator === 'between') {
            // Handle date range
            const [start, end] = value.split(' to ');
            domain.push([condition.field, '>=', start]);
            domain.push([condition.field, '<=', end]);
            return;
          }

          // Build domain condition
          if (condition.operator === 'in' || condition.operator === 'not in') {
            value = Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim());
          }

          domain.push([condition.field, condition.operator, value]);
        }
      }
    });

    onFilterChange(domain);
    setIsOpen(false);
  };

  const clearFilter = () => {
    setConditions([]);
    onFilterChange([]);
    setIsOpen(false);
  };

  const saveFilter = () => {
    if (filterName.trim() && onSaveFilter) {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name: filterName,
        conditions: [...conditions],
      };
      onSaveFilter(newFilter);
      setFilterName('');
    }
  };

  const loadFilter = (filter: SavedFilter) => {
    setConditions(filter.conditions);
    if (onLoadFilter) {
      onLoadFilter(filter);
    }
  };

  const getFieldType = (fieldName: string) => {
    return fields.find((f) => f.name === fieldName)?.type || 'string';
  };

  return (
    <div className="advanced-filter">
      <button
        className="filter-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle filter"
      >
        <Filter size={18} />
        <span>Filter</span>
        {conditions.length > 0 && (
          <span className="filter-badge">{conditions.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="filter-panel">
          <div className="filter-header">
            <h3>Advanced Filter</h3>
            <button
              className="filter-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close filter"
            >
              <X size={18} />
            </button>
          </div>

          <div className="filter-conditions">
            {conditions.length === 0 ? (
              <div className="filter-empty">
                <p>No filter conditions. Click "Add Condition" to start filtering.</p>
              </div>
            ) : (
              conditions.map((condition, index) => (
                <div key={index} className="filter-condition">
                  <select
                    value={condition.field}
                    onChange={(e) =>
                      updateCondition(index, {
                        field: e.target.value,
                        operator: operators[getFieldType(e.target.value)][0],
                        value: '',
                      })
                    }
                    className="filter-field"
                  >
                    {fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={condition.operator}
                    onChange={(e) =>
                      updateCondition(index, { operator: e.target.value })
                    }
                    className="filter-operator"
                  >
                    {operators[getFieldType(condition.field)].map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>

                  <input
                    type={
                      getFieldType(condition.field) === 'number'
                        ? 'number'
                        : getFieldType(condition.field) === 'date'
                        ? 'date'
                        : 'text'
                    }
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(index, { value: e.target.value })
                    }
                    placeholder="Value"
                    className="filter-value"
                  />

                  <button
                    className="filter-remove"
                    onClick={() => removeCondition(index)}
                    aria-label="Remove condition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="filter-actions">
            <button className="filter-add" onClick={addCondition}>
              <Plus size={16} />
              Add Condition
            </button>
          </div>

          {savedFilters.length > 0 && (
            <div className="saved-filters">
              <h4>Saved Filters</h4>
              <div className="saved-filters-list">
                {savedFilters.map((filter, idx) => (
                  <button
                    key={filter.id || (filter as any)._id || idx}
                    className="saved-filter-item"
                    onClick={() => loadFilter(filter)}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-save">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name"
              className="filter-name-input"
            />
            <button
              className="filter-save-btn"
              onClick={saveFilter}
              disabled={!filterName.trim() || conditions.length === 0}
            >
              <Save size={16} />
              Save Filter
            </button>
          </div>

          <div className="filter-footer">
            <button className="filter-clear" onClick={clearFilter}>
              Clear
            </button>
            <button className="filter-apply" onClick={applyFilter}>
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;

