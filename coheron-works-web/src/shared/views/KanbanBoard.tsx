import React, { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './KanbanBoard.css';

interface KanbanColumn {
    id: string;
    title: string;
    color: string;
}

interface KanbanItem {
    id: number;
    stage: string;
    [key: string]: any;
}

interface KanbanBoardProps {
    columns: KanbanColumn[];
    items: KanbanItem[];
    onItemMove: (itemId: number, newStage: string) => void;
    renderCard: (item: KanbanItem) => React.ReactNode;
}

function SortableCard({ id, children }: { id: number; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="kanban-card-wrapper">
            {children}
        </div>
    );
}

function DroppableColumn({
    id,
    children,
    column
}: {
    id: string;
    children: React.ReactNode;
    column: KanbanColumn;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`kanban-column ${isOver ? 'drop-over' : ''}`}
        >
            <div className="kanban-column-header" style={{ borderTopColor: column.color }}>
                <h3>{column.title}</h3>
            </div>
            {children}
        </div>
    );
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, items, onItemMove, renderCard }) => {
    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over) {
            const activeItem = items.find(item => item.id === active.id);
            if (!activeItem) {
                setActiveId(null);
                return;
            }

            // Check if dropped on a column
            const overColumn = columns.find(col => col.id === String(over.id));
            if (overColumn && activeItem.stage !== overColumn.id) {
                onItemMove(activeItem.id, overColumn.id);
            } else {
                // Check if dropped on a card in a different column
                const overItem = items.find(item => item.id === over.id);
                if (overItem && activeItem.stage !== overItem.stage) {
                    onItemMove(activeItem.id, overItem.stage);
                }
            }
        }

        setActiveId(null);
    };

    const activeItem = activeId ? items.find(item => item.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="kanban-board">
                {columns.map((column, idx) => {
                    const columnItems = items.filter(item => item.stage === column.id);

                    return (
                        <DroppableColumn key={column.id || (column as any)._id || idx} id={column.id} column={column}>
                            <SortableContext items={columnItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                <div className="kanban-column-content">
                                    <span className="kanban-count">{columnItems.length}</span>
                                    {columnItems.map((item, idx) => (
                                        <SortableCard key={item.id || (item as any)._id || idx} id={item.id}>
                                            {renderCard(item)}
                                        </SortableCard>
                                    ))}
                                </div>
                            </SortableContext>
                        </DroppableColumn>
                    );
                })}
            </div>

            <DragOverlay>
                {activeItem ? (
                    <div className="kanban-card-overlay">
                        {renderCard(activeItem)}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
