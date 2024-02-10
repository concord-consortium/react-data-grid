import { useState } from 'react';

import DataGrid from '../../src';
import type { Column } from '../../src';
import { renderCoordinates } from './renderers';
import type { Props } from './types';

type Row = number;
const rows: readonly Row[] = [...Array(10).keys()];

const columns: Column<Row>[] = [];

const defaultWidth = 100;

for (let i = 0; i < 6; i++) {
  const key = String(i);
  columns.push({
    key,
    name: key,
    renderCell: renderCoordinates,
    resizable: true,
    width: defaultWidth
  });
}

function restoreColumnWidths() {
  let columnWidths = new Map<string, number>();
  const columnWidthsStr = localStorage.getItem('columnWidths');
  if (!columnWidthsStr) return columnWidths;
  try {
    const columnWidthsParsed = JSON.parse(columnWidthsStr);
    if (Array.isArray(columnWidthsParsed)) {
      columnWidths = new Map<string, number>(columnWidthsParsed);
    }
  } catch {
    // ignore errors
  }
  return columnWidths;
}

function getResizedColumnWidths(columnWidths: Map<string, number>) {
  const resizedColumnWidths = new Map<string, number>();
  columnWidths.forEach((width, columnKey) => {
    if (width !== defaultWidth) {
      resizedColumnWidths.set(columnKey, width);
    }
  });
  return resizedColumnWidths;
}

let savedColumnWidths = new Map<string, number>();

function saveColumnWidths(columnWidths: Map<string, number>) {
  savedColumnWidths = getResizedColumnWidths(columnWidths);
  if (savedColumnWidths.size > 0) {
    localStorage.setItem('columnWidths', JSON.stringify(Array.from(savedColumnWidths.entries())));
  } else {
    localStorage.removeItem('columnWidths');
  }
}

const undoRedoStack: Array<{ columnKey: string; prevWidth: number; newWidth: number }> = [];

export default function SaveColumnWidths({ direction }: Props) {
  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(restoreColumnWidths());
  const [undoRedoIndex, setUndoRedoIndex] = useState(0);

  function handleUndo() {
    const { columnKey, prevWidth } = undoRedoStack[undoRedoIndex - 1];
    setColumnWidths((widths) => {
      const newWidths = new Map(widths);
      newWidths.set(columnKey, prevWidth);
      saveColumnWidths(newWidths);
      return newWidths;
    });
    setUndoRedoIndex((index) => --index);
  }

  function handleRedo() {
    const { columnKey, newWidth } = undoRedoStack[undoRedoIndex];
    setColumnWidths((widths) => {
      const newWidths = new Map(widths);
      newWidths.set(columnKey, newWidth);
      saveColumnWidths(newWidths);
      return newWidths;
    });
    setUndoRedoIndex((index) => ++index);
  }

  function handleReset() {
    setColumnWidths((widths) => {
      const newWidths = new Map(widths);
      newWidths.forEach((width, columnKey) => {
        newWidths.set(columnKey, defaultWidth);
      });
      saveColumnWidths(newWidths);
      return newWidths;
    });
    undoRedoStack.splice(0, undoRedoStack.length);
    setUndoRedoIndex(0);
  }

  function handleColumnResize(idx: number, width: number, isComplete?: boolean) {
    const columnKey = String(idx);
    columnWidths.set(columnKey, width);

    if (isComplete) {
      // clear redo items
      if (undoRedoIndex < undoRedoStack.length)
        undoRedoStack.splice(undoRedoIndex, undoRedoStack.length - undoRedoIndex);
      // push undo item
      undoRedoStack.push({
        columnKey,
        prevWidth: savedColumnWidths.get(columnKey) ?? defaultWidth,
        newWidth: width
      });
      setUndoRedoIndex((index) => ++index);
      // save widths to local storage
      saveColumnWidths(columnWidths);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex' }}>
        <button style={{ margin: 5 }} disabled={undoRedoIndex === 0} onClick={handleUndo}>
          Undo Column Width Change
        </button>
        <button
          style={{ margin: 5 }}
          disabled={undoRedoIndex === undoRedoStack.length}
          onClick={handleRedo}
        >
          Redo Column Width Change
        </button>
        <button
          style={{ margin: 5 }}
          disabled={getResizedColumnWidths(columnWidths).size === 0}
          onClick={handleReset}
        >
          Reset Column Widths
        </button>
      </div>
      <DataGrid
        columns={columns}
        rows={rows}
        columnWidths={columnWidths}
        onColumnResize={handleColumnResize}
        className="fill-grid"
        style={{ resize: 'both' }}
        direction={direction}
      />
    </div>
  );
}
