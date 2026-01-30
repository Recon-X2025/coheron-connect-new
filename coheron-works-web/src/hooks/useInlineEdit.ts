import { useState, useCallback } from 'react';

export function useInlineEdit<T extends Record<string, any>>() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<T>>({});

  const startEdit = useCallback((id: number, values: Partial<T>) => {
    setEditingId(id);
    setEditValues(values);
  }, []);

  const updateField = useCallback((field: keyof T, value: any) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveEdit = useCallback(() => {
    const values = editValues;
    setEditingId(null);
    setEditValues({});
    return values;
  }, [editValues]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues({});
  }, []);

  return { editingId, editValues, startEdit, updateField, saveEdit, cancelEdit };
}
