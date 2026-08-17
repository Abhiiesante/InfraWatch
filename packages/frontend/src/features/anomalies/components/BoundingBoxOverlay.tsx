import React from 'react';

export interface Detection {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number]; // [left, top, w, h] in absolute coordinates
  severity?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface BoundingBoxOverlayProps {
  imageUrl: string;
  detections: Detection[];
  cameraName?: string;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({ imageUrl, detections, cameraName }) => {
  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden group">
      <img
        src={imageUrl || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80'}
        alt="AI Inference Frame"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80';
        }}
      />

      {cameraName && (
        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1.5 border border-white/40 shadow-sm z-20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {cameraName}
        </div>
      )}

      {/* Roboflow-style Bounding Boxes */}
      {detections.map((detection, index) => {
        if (!detection.bbox || detection.bbox.length !== 4) return null;
        
        const [x, y, w, h] = detection.bbox;
        
        // Use provided dimensions or fallback to 1280x720
        const ORIGINAL_WIDTH = detection.imageWidth || 1280;
        const ORIGINAL_HEIGHT = detection.imageHeight || 720;
        
        // Convert to percentages for dynamic scaling
        const left = (x / ORIGINAL_WIDTH) * 100;
        const top = (y / ORIGINAL_HEIGHT) * 100;
        const width = (w / ORIGINAL_WIDTH) * 100;
        const height = (h / ORIGINAL_HEIGHT) * 100;
        
        const confDisplay = Math.round(detection.confidence <= 1 ? detection.confidence * 100 : detection.confidence);
        
        // Use high-visibility inference colors
        const color = detection.severity === 'CRITICAL' ? '#EF4444' : '#06B6D4'; // Red or Cyan
        
        return (
          <div
            key={index}
            className="absolute border-[2.5px] transition-all cursor-pointer pointer-events-auto z-10 hover:bg-white/10"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              borderColor: color,
              boxShadow: `0 0 10px ${color}40`,
            }}
          >
            {/* Label Tab - Top Left Attached */}
            <div 
              className="absolute -top-[22px] left-[-2.5px] text-white text-[10px] font-extrabold px-1.5 py-0.5 whitespace-nowrap tracking-wide"
              style={{ backgroundColor: color }}
            >
              {detection.label.replace(/_/g, ' ')} {confDisplay}%
            </div>
            
            {/* Corner crosshairs for Roboflow effect */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: color }} />
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: color }} />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: color }} />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: color }} />
          </div>
        );
      })}
    </div>
  );
};
