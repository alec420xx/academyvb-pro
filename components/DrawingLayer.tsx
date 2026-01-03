import React from 'react';
import { DrawingShape, Point } from '../types';
import { getDistance } from '../utils';

interface DrawingLayerProps {
  shapes: DrawingShape[];
  currentShape: DrawingShape | null;
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  shapes,
  currentShape,
  selectedShapeId,
  onSelectShape,
}) => {
  // Helper to render a shape
  const renderShape = (shape: DrawingShape, isSelected: boolean) => {
    const commonProps = {
      stroke: shape.color,
      strokeWidth: shape.strokeWidth,
      fill: 'none',
      opacity: isSelected ? 0.8 : 1,
      style: { cursor: 'pointer' } as React.CSSProperties,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectShape(shape.id);
      },
    };

    if (isSelected) {
      commonProps.strokeWidth += 2;
      commonProps.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.5))';
    }

    if (shape.type === 'path') {
      const d = shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return <path key={shape.id} d={d} strokeLinecap="round" strokeLinejoin="round" {...commonProps} />;
    }

    if (shape.type === 'line') {
      const [start, end] = shape.points;
      if (!start || !end) return null;
      return <line key={shape.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} {...commonProps} />;
    }

    if (shape.type === 'arrow') {
      const [start, end] = shape.points;
      if (!start || !end) return null;

      const dist = getDistance(start, end);
      const shortenLen = 5 * shape.strokeWidth;

      let finalEnd = end;
      if (dist > shortenLen) {
        const ratio = shortenLen / dist;
        finalEnd = {
          x: end.x - (end.x - start.x) * ratio,
          y: end.y - (end.y - start.y) * ratio
        };
      }

      const markerId = `arrowhead-${shape.id}`;
      return (
        <g key={shape.id} onClick={commonProps.onClick}>
          <defs>
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="7"
              refX="5"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={shape.color} />
            </marker>
          </defs>
          <line
            x1={start.x}
            y1={start.y}
            x2={finalEnd.x}
            y2={finalEnd.y}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="butt"
            markerEnd={`url(#${markerId})`}
            style={commonProps.style}
          />
        </g>
      );
    }

    if (shape.type === 'polygon') {
      const pointsStr = shape.points.map(p => `${p.x},${p.y}`).join(' ');
      return <polygon key={shape.id} points={pointsStr} fill={shape.color} fillOpacity={0.2} stroke={shape.color} strokeWidth={shape.strokeWidth} onClick={commonProps.onClick} style={{ cursor: 'pointer' }} />;
    }

    return null;
  };

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-visible">
      <defs>
        {/* Global defs if needed */}
      </defs>

      {/* Existing Shapes */}
      <g className="pointer-events-auto">
        {shapes.map((shape) => renderShape(shape, shape.id === selectedShapeId))}
      </g>

      {/* Currently Drawing Shape */}
      {currentShape && (
        <g className="opacity-60 pointer-events-none">
          {renderShape({ ...currentShape, id: 'temp' }, false)}
        </g>
      )}
    </svg>
  );
};