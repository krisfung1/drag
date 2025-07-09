import { DndContext, closestCenter, useDndContext, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useRef } from 'react';
import './App.css';
import { restrictToFirstScrollableAncestor, restrictToParentElement } from '@dnd-kit/modifiers';
import React from 'react'; // Added missing import for React

const COLUMN_COUNT = 3;
const GRID_WIDTH = 1000;
const GRID_GAP = 16;
const COLUMN_WIDTH = Math.floor((GRID_WIDTH - (COLUMN_COUNT - 1) * GRID_GAP) / COLUMN_COUNT);
const COLUMN_WIDTHS = [COLUMN_WIDTH, COLUMN_WIDTH * 2 + GRID_GAP];

const GRID_HEIGHT = 800;
const HEADER_HEIGHT = 48; // approx height for h2
const BUTTON_HEIGHT = 56; // approx height for button + margin
const ROW_COUNT = 3;
const TOTAL_GAP_HEIGHT = GRID_GAP * (ROW_COUNT - 1);
const GRID_BODY_HEIGHT = GRID_HEIGHT - HEADER_HEIGHT - BUTTON_HEIGHT;
const CARD_HEIGHT = Math.floor((GRID_BODY_HEIGHT - TOTAL_GAP_HEIGHT) / ROW_COUNT);

const pastelColors = [
  '#FFD1DC', // pastel pink
  '#B5EAD7', // pastel green
  '#C7CEEA', // pastel purple
  '#FFDAC1', // pastel peach
  '#E2F0CB', // pastel mint
  '#FFB7B2', // pastel coral
  '#B5EAD7', // pastel green (repeat for variety)
  '#C7CEEA', // pastel purple (repeat)
  '#FFD1DC', // pastel pink (repeat)
];

const initialCards = Array.from({ length: 9 }, (_, i) => ({
  id: (i + 1).toString(),
  content: `Card ${i + 1}`,
  colSpan: 1,
  color: pastelColors[i % pastelColors.length],
}));

function SortableItem({ id, content, index, colSpan, onResize, color, activeId }: { id: string; content: string; index: number; colSpan: number; onResize: (newColSpan: number) => void; color: string; activeId?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startColSpan = useRef<number>(colSpan);
  const [isResizing, setIsResizing] = useState(false);

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (activeId === id && isDragging) {
    // Render a transparent placeholder in the original spot
    return (
      <div
        style={{
          gridColumn: `span ${colSpan}`,
          minWidth: 0,
          height: '100%',
          border: '2px dashed #ccc',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.05)',
          opacity: 0.5,
        }}
      />
    );
  }

  const style = {
    transform: isResizing ? undefined : CSS.Transform.toString(transform),
    transition: isResizing ? undefined : transition,
    zIndex: isDragging ? 2 : 1,
    backgroundColor: color || '#FFD1DC',
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    boxSizing: 'border-box' as const,
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    cursor: isResizing ? 'ew-resize' : 'grab',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    transitionProperty: 'background, box-shadow, transform',
    position: 'relative' as const,
    overflow: 'visible',
    gridColumn: `span ${colSpan}`,
    minWidth: 0,
  };

  // Resize handlers
  function onMouseDownResize(e: React.MouseEvent) {
    e.stopPropagation();
    setIsResizing(true);
    startX.current = e.clientX;
    startColSpan.current = colSpan;
    document.addEventListener('mousemove', onMouseMoveResize);
    document.addEventListener('mouseup', onMouseUpResize);
  }
  function onMouseMoveResize(e: MouseEvent) {
    if (startX.current !== null) {
      const delta = e.clientX - startX.current;
      let rawWidth = startColSpan.current * COLUMN_WIDTH + delta;
      // Snap to 1 or 2 columns
      let snappedColSpan = rawWidth > (COLUMN_WIDTH + COLUMN_WIDTH / 2) ? 2 : 1;
      onResize(snappedColSpan);
    }
  }
  function onMouseUpResize() {
    setIsResizing(false);
    startX.current = null;
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUpResize);
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* 3-dot icon */}
      <button
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 24,
          padding: 0,
          zIndex: 10,
        }}
        onClick={e => {
          e.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        aria-label="Open menu"
        type="button"
      >
        <span style={{ display: 'inline-block', lineHeight: 1 }}>&#8942;</span>
      </button>
      {/* Debug: Show menuOpen state */}
      {/* <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 12, color: '#888' }}>menuOpen: {menuOpen ? 'true' : 'false'}</div> */}
      {/* Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: 40,
            right: 8,
            background: '#fff',
            border: '2px solid #888',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            padding: '8px 0',
            minWidth: 120,
            zIndex: 1000,
            overflow: 'visible',
          }}
        >
          <div style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', background: '#f0f0f0' }}>
            ✓ Small
          </div>
          <div style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Large
          </div>
        </div>
      )}
      {/* Main card area for drag listeners */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} {...(!isResizing ? listeners : {})} />
      <h1 style={{ color: 'black', fontSize: '2.5rem', margin: 0, position: 'relative', zIndex: 2 }}>{content}</h1>
      {/* Resize handle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 12,
          height: '100%',
          cursor: 'ew-resize',
          zIndex: 20,
          background: 'rgba(0,0,0,0.05)',
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseDown={onMouseDownResize}
        title="Resize horizontally"
      >
        <div style={{ width: 4, height: 32, background: '#bbb', borderRadius: 2 }} />
      </div>
    </div>
  );
}

function App() {
  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleResize = (id: string, newColSpan: number) => {
    setCards(cards => cards.map(card => card.id === id ? { ...card, colSpan: newColSpan } : card));
  };

  const handleReset = () => {
    setCards(initialCards);
  };

  const activeCard = cards.find(card => card.id === activeId);

  return (
    <div style={{ width: 1000, height: GRID_HEIGHT, margin: '40px auto', overflow: 'hidden' }}>
      <h2 style={{ margin: 0, padding: 0, height: HEADER_HEIGHT }}>Monetize dashboard drag and drop concept</h2>
      <button onClick={handleReset} style={{ marginBottom: 16, padding: '8px 20px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', color: 'black', height: 40 }}>
        Reset
      </button>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        onDragStart={event => setActiveId(event.active.id as string)}
        onDragEnd={event => {
          setActiveId(null);
          const { active, over } = event;
          if (over && active.id !== over.id) {
            setCards((items) => {
              const oldIndex = items.findIndex((item) => item.id === active.id);
              const newIndex = items.findIndex((item) => item.id === over.id);
              return arrayMove(items, oldIndex, newIndex);
            });
          }
        }}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={cards.map((card) => card.id)} strategy={rectSortingStrategy}>
          <div
            className="card-grid-scroll"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: `repeat(3, ${CARD_HEIGHT}px)`,
              gap: GRID_GAP,
              width: '100%',
              height: GRID_BODY_HEIGHT,
              overflow: 'auto',
            }}
          >
            {cards.map((card, idx) => (
              <SortableItem
                key={card.id}
                id={card.id}
                content={card.content}
                index={idx}
                colSpan={card.colSpan}
                onResize={newColSpan => handleResize(card.id, newColSpan)}
                color={card.color}
                activeId={activeId ?? undefined}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeCard ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: activeCard.color,
                border: '1px solid #ccc',
                borderRadius: 8,
                padding: 16,
                boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 'bold',
                opacity: 0.9,
              }}
            >
              <h1 style={{ color: 'black', fontSize: '2.5rem', margin: 0 }}>{activeCard.content}</h1>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default App;
