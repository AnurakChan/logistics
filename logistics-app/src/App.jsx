import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MousePointer2, 
  Hand, 
  Hexagon, 
  Route, 
  Play, 
  Download, 
  Upload, 
  Truck, 
  RotateCw, 
  ZoomIn, 
  ZoomOut,
  Map as MapIcon,
  Layers, 
  Trash2,
  Check,
  Clock,
  Ruler,
  Gauge // Icon for Speed
} from 'lucide-react';

// --- Constants & Types ---
const ZONE_TYPES = {
  CHARGING: { id: 'charging', label: 'สถานีชาร์จ', color: '#10b981', icon: '⚡' }, 
  SWAP: { id: 'swap', label: 'สถานีสลับแบต', color: '#3b82f6', icon: '🔋' }, 
  TRAILER: { id: 'trailer', label: 'ลานวางหาง', color: '#f97316', icon: '🚛' }, 
  TRACTOR: { id: 'tractor', label: 'ลานวางหัวลาก', color: '#ef4444', icon: '🚜' }, 
  MAINTENANCE: { id: 'maintenance', label: 'ลานซ่อม', color: '#6b7280', icon: '🔧' }, 
  BOUNDARY: { id: 'boundary', label: 'เส้นขอบเขตสถานี', color: '#374151', icon: '🚧' }, 
  OTHER: { id: 'other', label: 'อื่นๆ', color: '#a8a29e', icon: '📦' }, 
};

const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  DRAW_ZONE: 'draw_zone',
  DRAW_PATH: 'draw_path',
};

const MAP_SOURCES = {
  OSM: { id: 'osm', label: 'แผนที่ถนน', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
  SATELLITE: { id: 'satellite', label: 'ดาวเทียม', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '© Google Maps' }
};

// Simulation Settings
const PIXELS_TO_METERS = 1; 

// --- Map Configuration ---
const TILE_SIZE = 256;
const MAP_ZOOM_LEVEL = 19; 
const ORIGIN_LAT = 13.921446; 
const ORIGIN_LON = 101.5769;

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const distance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const getPathLength = (points) => {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += distance(points[i], points[i+1]);
  }
  return len;
};

// Math for Web Mercator
const lon2tile = (lon, zoom) => (lon + 180) / 360 * Math.pow(2, zoom);
const lat2tile = (lat, zoom) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);

const getOriginPixel = () => {
  const tileX = lon2tile(ORIGIN_LON, MAP_ZOOM_LEVEL);
  const tileY = lat2tile(ORIGIN_LAT, MAP_ZOOM_LEVEL);
  return { x: tileX * TILE_SIZE, y: tileY * TILE_SIZE };
};

const getCentroid = (points) => {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  const center = points.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x:0, y:0});
  return { x: center.x / points.length, y: center.y / points.length };
};

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

// --- Sub-Component: Map Background ---
const MapBackground = ({ view, canvasSize, mapSource }) => {
  const origin = useMemo(() => getOriginPixel(), []);
  
  if (!canvasSize.width) return null;

  // Calculate Rotated Bounding Box
  // We need to find the bounding box of the visible area in World Space
  // considering the rotation and scale.
  const cx = canvasSize.width / 2;
  const cy = canvasSize.height / 2;
  const tx = view.x + cx;
  const ty = view.y + cy;
  
  // Screen corners
  const corners = [
    { x: 0, y: 0 },
    { x: canvasSize.width, y: 0 },
    { x: canvasSize.width, y: canvasSize.height },
    { x: 0, y: canvasSize.height }
  ];

  // Convert each screen corner to World Coordinate
  const r = -view.rotation * (Math.PI / 180); // Inverse rotation
  const cos = Math.cos(r);
  const sin = Math.sin(r);

  const minMax = corners.reduce((acc, p) => {
    // 1. Untranslate
    let x = p.x - tx;
    let y = p.y - ty;
    
    // 2. Unscale
    x /= view.scale;
    y /= view.scale;
    
    // 3. Unrotate
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    
    return {
      minX: Math.min(acc.minX, rx),
      maxX: Math.max(acc.maxX, rx),
      minY: Math.min(acc.minY, ry),
      maxY: Math.max(acc.maxY, ry),
    };
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

  // Add buffer to prevent edge flickering
  const buffer = TILE_SIZE; 
  const absLeft = minMax.minX + origin.x - buffer;
  const absTop = minMax.minY + origin.y - buffer;
  const absRight = minMax.maxX + origin.x + buffer;
  const absBottom = minMax.maxY + origin.y + buffer;

  const minTileX = Math.floor(absLeft / TILE_SIZE);
  const maxTileX = Math.floor(absRight / TILE_SIZE);
  const minTileY = Math.floor(absTop / TILE_SIZE);
  const maxTileY = Math.floor(absBottom / TILE_SIZE);

  const tiles = [];
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      tiles.push({ x, y, key: `${x}-${y}` });
    }
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
      {tiles.map(tile => {
        const url = mapSource.url.replace('{z}', MAP_ZOOM_LEVEL).replace('{x}', tile.x).replace('{y}', tile.y);
        return (
          <img
            key={tile.key}
            src={url}
            alt=""
            className={`absolute max-w-none transition-opacity duration-500 ${mapSource.id === 'osm' ? 'grayscale opacity-70' : 'brightness-110 contrast-110'}`}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: (tile.x * TILE_SIZE) - origin.x,
              top: (tile.y * TILE_SIZE) - origin.y,
            }}
          />
        );
      })}
    </div>
  );
};

// --- Main Component ---
export default function LogisticsDesigner() {
  const [view, setView] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [mapType, setMapType] = useState(MAP_SOURCES.OSM);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Data
  const [zones, setZones] = useState([]);
  const [paths, setPaths] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Interaction
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [activeZoneType, setActiveZoneType] = useState(ZONE_TYPES.TRAILER.id);
  
  // Drawing States
  const [isDrawing, setIsDrawing] = useState(false);
  const [polyPoints, setPolyPoints] = useState([]); 
  
  // Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simSpeed, setSimSpeed] = useState(40); // Default 40 km/h
  
  const canvasRef = useRef(null);
  const requestRef = useRef();

  // --- Resize Handler ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const updateSize = () => {
      setCanvasSize({
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // --- View Control ---
  const handleWheel = (e) => {
    if (e.ctrlKey || activeTool === TOOLS.PAN) {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(view.scale + scaleAmount, 0.2), 5);
        setView(v => ({ ...v, scale: newScale }));
    } else {
       setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  const toWorld = (screenX, screenY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    
    let x = screenX - rect.left - cx - view.x;
    let y = screenY - rect.top - cy - view.y;

    x /= view.scale;
    y /= view.scale;

    const rad = -view.rotation * (Math.PI / 180);
    const rotX = x * Math.cos(rad) - y * Math.sin(rad);
    const rotY = x * Math.sin(rad) + y * Math.cos(rad);

    return { x: rotX, y: rotY };
  };

  // --- Input Handlers ---
  const handleMouseDown = (e) => {
    if (activeTool === TOOLS.PAN || e.button === 1 || (e.key === ' ' && e.type === 'keydown')) {
      setIsDraggingCanvas(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = toWorld(e.clientX, e.clientY);

    if (activeTool === TOOLS.DRAW_ZONE || activeTool === TOOLS.DRAW_PATH) {
      if (polyPoints.length === 0) {
        setPolyPoints([pos, pos]); 
        setIsDrawing(true);
      } else {
        setPolyPoints(prev => [...prev, pos]);
      }
    } else if (activeTool === TOOLS.SELECT) {
        if(e.target === canvasRef.current) {
            setSelectedId(null);
        }
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = toWorld(e.clientX, e.clientY);

    if (isDrawing && (activeTool === TOOLS.DRAW_ZONE || activeTool === TOOLS.DRAW_PATH) && polyPoints.length > 0) {
      setPolyPoints(prev => {
        const next = [...prev];
        next[next.length - 1] = pos;
        return next;
      });
    }
  };

  const handleMouseUp = (e) => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      return;
    }
  };

  const handleDoubleClick = () => {
      if (isDrawing && (activeTool === TOOLS.DRAW_ZONE || activeTool === TOOLS.DRAW_PATH)) {
          finishPoly();
      }
  };

  const finishPoly = () => {
    if (polyPoints.length < 3) {
        setPolyPoints([]);
        setIsDrawing(false);
        return;
    }

    const finalPoints = polyPoints.slice(0, -1); 

    if (activeTool === TOOLS.DRAW_ZONE) {
        const newZone = {
            id: generateId(),
            shape: 'polygon',
            type: activeZoneType,
            points: finalPoints
        };
        setZones(prev => [...prev, newZone]);
        setSelectedId(newZone.id);
    } else if (activeTool === TOOLS.DRAW_PATH) {
        const newPath = {
            id: generateId(),
            points: finalPoints,
            name: `Path ${paths.length + 1}`
        };
        setPaths(prev => [...prev, newPath]);
    }

    setPolyPoints([]);
    setIsDrawing(false);
  };

  const getPolyString = (points) => points.map(p => `${p.x},${p.y}`).join(' ');

  // --- XML Export/Import ---
  const exportXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Layout>\n<Zones>\n';
    zones.forEach(z => {
        if(z.shape === 'rect') {
             xml += `  <Zone id="${z.id}" shape="rect" type="${z.type}" x="${z.x}" y="${z.y}" width="${z.width}" height="${z.height}" />\n`;
        } else {
             const pts = z.points.map(p => `${p.x},${p.y}`).join(' ');
             xml += `  <Zone id="${z.id}" shape="polygon" type="${z.type}" points="${pts}" />\n`;
        }
    });
    xml += '</Zones>\n<Paths>\n';
    paths.forEach(p => {
      const pointsStr = p.points.map(pt => `${pt.x},${pt.y}`).join(' ');
      xml += `  <Path id="${p.id}" points="${pointsStr}" />\n`;
    });
    xml += '</Paths>\n</Layout>';

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout.xml';
    a.click();
  };

  const importXML = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(evt.target.result, "text/xml");
        const newZones = [];
        const zoneNodes = xmlDoc.getElementsByTagName("Zone");
        for (let i = 0; i < zoneNodes.length; i++) {
            const node = zoneNodes[i];
            const shape = node.getAttribute("shape") || 'rect'; 
            if(shape === 'rect') {
                newZones.push({
                    id: node.getAttribute("id"), shape: 'rect', type: node.getAttribute("type"),
                    x: parseFloat(node.getAttribute("x")), y: parseFloat(node.getAttribute("y")),
                    width: parseFloat(node.getAttribute("width")), height: parseFloat(node.getAttribute("height")),
                });
            } else {
                const pts = node.getAttribute("points").split(' ').map(p => {
                    const [x,y] = p.split(','); return {x:parseFloat(x), y:parseFloat(y)};
                });
                newZones.push({
                    id: node.getAttribute("id"), shape: 'polygon', type: node.getAttribute("type"), points: pts
                });
            }
        }
        setZones(newZones);
        
        const newPaths = [];
        const pathNodes = xmlDoc.getElementsByTagName("Path");
        for (let i = 0; i < pathNodes.length; i++) {
            const node = pathNodes[i];
            const pts = node.getAttribute("points").split(' ').map(p => {
                const [x,y] = p.split(','); return {x:parseFloat(x), y:parseFloat(y)};
            });
            newPaths.push({ id: node.getAttribute("id"), points: pts });
        }
        setPaths(newPaths);
      };
      reader.readAsText(file);
  };

  const deleteSelected = () => {
    setZones(prev => prev.filter(z => z.id !== selectedId));
    setPaths(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(null);
  };

  // --- Simulation Logic ---
  useEffect(() => {
    if (!isSimulating) { cancelAnimationFrame(requestRef.current); return; }
    const animate = () => {
        // Adjust speed factor based on simSpeed. 
        // 40kmh -> 0.002 step. 
        const speedFactor = (simSpeed / 40) * 0.002;
        setSimulationProgress(p => (p + speedFactor) % 1);
        requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isSimulating, simSpeed]);

  const getTruckPosition = (pathPoints, progress) => {
    if (!pathPoints || pathPoints.length < 2) return null;
    
    const totalLen = getPathLength(pathPoints);
    const targetDist = totalLen * progress;
    
    let currentDist = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i+1];
      const dist = distance(p1, p2);
      
      if (currentDist + dist >= targetDist) {
        const remaining = targetDist - currentDist;
        const ratio = remaining / dist;
        return {
          x: p1.x + (p2.x - p1.x) * ratio,
          y: p1.y + (p2.y - p1.y) * ratio,
          angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180/Math.PI),
          dist: targetDist // Return current distance as well
        };
      }
      currentDist += dist;
    }
    return { ...pathPoints[pathPoints.length - 1], angle: 0, dist: totalLen };
  };

  // --- Stats Calculation ---
  const calculateStats = (path) => {
      const distMeters = Math.round(getPathLength(path.points) * PIXELS_TO_METERS);
      // Speed in m/s = (km/h * 1000) / 3600
      const speedMetersPerSec = (simSpeed * 1000) / 3600; 
      const timeSeconds = distMeters / speedMetersPerSec;
      return { dist: distMeters, time: timeSeconds };
  };

  // Helper for tool classes to replace styled-jsx
  const getToolClass = (toolName) => {
    const base = "flex items-center gap-2 p-2 rounded text-sm transition-all";
    const active = "bg-orange-100 text-orange-700 font-medium ring-1 ring-orange-300";
    const inactive = "hover:bg-gray-100 text-gray-600";
    return `${base} ${activeTool === toolName ? active : inactive}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-orange-200 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">L</div>
          <div>
            <h1 className="font-bold text-lg text-gray-800">Logistics Designer</h1>
            <p className="text-xs text-orange-500">Terminal Layout & Simulation</p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
           <button 
                onClick={() => setMapType(mapType.id === 'osm' ? MAP_SOURCES.SATELLITE : MAP_SOURCES.OSM)}
                className="flex items-center gap-2 px-3 py-1 bg-white rounded border border-gray-300 hover:bg-gray-50 text-xs font-bold"
           >
               <Layers size={14}/> {mapType.id === 'osm' ? 'Switch to Satellite' : 'Switch to Map'}
           </button>
           <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
           <button onClick={() => setView(v => ({...v, scale: v.scale - 0.1}))} className="p-1 hover:bg-white rounded"><ZoomOut size={16}/></button>
           <span className="text-xs w-8 text-center">{Math.round(view.scale * 100)}%</span>
           <button onClick={() => setView(v => ({...v, scale: v.scale + 0.1}))} className="p-1 hover:bg-white rounded"><ZoomIn size={16}/></button>
           <RotateCw size={16} className="ml-2 text-gray-400"/>
           <input type="range" min="0" max="360" value={view.rotation} onChange={(e)=>setView(v=>({...v,rotation:parseInt(e.target.value)}))} className="w-20 accent-orange-500"/>
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-2">
           <label className="p-2 text-gray-600 bg-white border rounded hover:bg-gray-50 cursor-pointer"><Upload size={16} /><input type="file" className="hidden" onChange={importXML}/></label>
           <button onClick={exportXML} className="p-2 text-white bg-orange-500 rounded hover:bg-orange-600 shadow-md"><Download size={16} /></button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">เครื่องมือ (Tools)</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveTool(TOOLS.SELECT)} className={getToolClass(TOOLS.SELECT)}><MousePointer2 size={18} /> เลือก</button>
              <button onClick={() => setActiveTool(TOOLS.PAN)} className={getToolClass(TOOLS.PAN)}><Hand size={18} /> เลื่อน</button>
              <button onClick={() => setActiveTool(TOOLS.DRAW_ZONE)} className={getToolClass(TOOLS.DRAW_ZONE)}><Hexagon size={18} /> วาดพื้นที่</button>
              <button onClick={() => setActiveTool(TOOLS.DRAW_PATH)} className={getToolClass(TOOLS.DRAW_PATH)}><Route size={18} /> เส้นทางวิ่ง</button>
            </div>
            
            {(activeTool === TOOLS.DRAW_ZONE || activeTool === TOOLS.DRAW_PATH) && (
               <div className="mt-2 text-center">
                   <button onClick={finishPoly} className="w-full py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex items-center justify-center gap-2">
                     <Check size={14}/> เสร็จสิ้น (หรือ ดับเบิ้ลคลิก)
                   </button>
               </div>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {activeTool === TOOLS.DRAW_ZONE ? (
              <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">เลือกประเภทพื้นที่</h3>
                  {Object.values(ZONE_TYPES).map((type) => (
                    <button key={type.id} onClick={() => setActiveZoneType(type.id)}
                      className={`w-full flex items-center p-2 rounded border transition-all ${activeZoneType === type.id ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-orange-300'}`}>
                      <span className="w-6 h-6 flex items-center justify-center rounded-full mr-3 text-xs" style={{ backgroundColor: type.color + '40', color: type.color }}>{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="bg-orange-50 p-4 rounded border border-orange-100">
                    <div className="flex justify-between mb-2"><h3 className="font-bold text-orange-800">Simulation</h3><Truck className="text-orange-500" size={18}/></div>
                    
                    {/* Speed Control */}
                    <div className="mb-4 bg-white p-3 rounded border border-orange-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><Gauge size={12}/> Speed</span>
                            <span className="text-xs font-bold text-orange-600">{simSpeed} km/h</span>
                        </div>
                        <input 
                            type="range" 
                            min="10" 
                            max="80" 
                            step="5"
                            value={simSpeed} 
                            onChange={(e) => setSimSpeed(Number(e.target.value))}
                            className="w-full accent-orange-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>10</span>
                            <span>80</span>
                        </div>
                    </div>

                    <button onClick={() => setIsSimulating(!isSimulating)} disabled={paths.length === 0}
                        className={`w-full py-2 rounded text-sm font-bold shadow-sm transition-all ${isSimulating ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                        {isSimulating ? 'หยุดจำลอง' : 'เริ่มจำลอง'}
                    </button>

                    {isSimulating && paths.length > 0 && (
                        <div className="mt-4 space-y-2 bg-white/50 p-2 rounded max-h-40 overflow-y-auto text-xs">
                             {paths.map((p, idx) => {
                                 const stats = calculateStats(p);
                                 return (
                                    <div key={p.id} className="flex justify-between items-center border-b border-orange-100 pb-1">
                                        <span className="font-semibold text-gray-600">เส้นทาง {idx + 1}</span>
                                        <div className="text-right text-gray-500">
                                            <div>{stats.dist} m</div>
                                            <div>{formatTime(stats.time)}</div>
                                        </div>
                                    </div>
                                 );
                             })}
                        </div>
                    )}
                 </div>
                 {selectedId && <button onClick={deleteSelected} className="w-full py-1.5 flex justify-center gap-2 text-xs text-red-600 border border-red-200 bg-red-50 rounded"><Trash2 size={14}/> ลบที่เลือก</button>}
              </div>
            )}
          </div>
        </aside>

        {/* CANVAS */}
        <main className="flex-1 bg-gray-200 overflow-hidden relative cursor-crosshair">
            <div className="absolute bottom-1 right-1 bg-white/80 px-2 py-0.5 rounded text-[10px] text-gray-500 z-10 pointer-events-none">
               {mapType.attribution}
            </div>

            <div ref={canvasRef} className="w-full h-full"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel} onDoubleClick={handleDoubleClick}
              style={{ cursor: activeTool === TOOLS.PAN || isDraggingCanvas ? 'grab' : 'crosshair' }}
            >
              <div style={{
                  transform: `translate(${view.x + canvasSize.width/2}px, ${view.y + canvasSize.height/2}px) scale(${view.scale}) rotate(${view.rotation}deg)`,
                  transformOrigin: '0 0', position: 'absolute', top: 0, left: 0
                }}>
                 
                 {/* 1. Map Layer */}
                 <MapBackground view={view} canvasSize={canvasSize} mapSource={mapType} />

                 {/* 2. SVG Layer */}
                 <svg className="absolute -top-[10000px] -left-[10000px] w-[20000px] h-[20000px] overflow-visible pointer-events-none">
                    
                    {/* Zones */}
                    {zones.map(zone => {
                        const typeInfo = Object.values(ZONE_TYPES).find(t => t.id === zone.type) || ZONE_TYPES.OTHER;
                        const isSelected = selectedId === zone.id;
                        
                        if (zone.shape === 'rect') {
                            return (
                                <rect 
                                    key={zone.id}
                                    x={zone.x + 10000} y={zone.y + 10000} width={zone.width} height={zone.height}
                                    fill={typeInfo.color} fillOpacity="0.4"
                                    stroke={isSelected ? '#fff' : typeInfo.color} strokeWidth={isSelected ? 4 : 2}
                                    className="pointer-events-auto cursor-pointer transition-all hover:fill-opacity-60"
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(zone.id); }}
                                />
                            );
                        } else {
                            return (
                                <polygon
                                    key={zone.id}
                                    points={getPolyString(zone.points.map(p => ({x: p.x + 10000, y: p.y + 10000})))}
                                    fill={typeInfo.color} fillOpacity="0.5"
                                    stroke={isSelected ? '#fff' : typeInfo.color} strokeWidth={isSelected ? 3 : 1.5}
                                    className="pointer-events-auto cursor-pointer transition-all hover:fill-opacity-70"
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(zone.id); }}
                                />
                            );
                        }
                    })}

                    {/* Active Drawing Preview */}
                    {polyPoints.length > 0 && (
                        <>
                           <polyline
                                points={getPolyString(polyPoints.map(p => ({x: p.x + 10000, y: p.y + 10000})))}
                                fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="5,5"
                            />
                            {polyPoints.map((p, i) => (
                                <circle key={i} cx={p.x + 10000} cy={p.y + 10000} r="3" fill="#fff" stroke="#f97316" />
                            ))}
                        </>
                    )}

                    {/* Paths */}
                    {paths.map((path, idx) => {
                        const stats = calculateStats(path);
                        return (
                        <g key={path.id} onClick={(e) => { e.stopPropagation(); setSelectedId(path.id); }} className="pointer-events-auto cursor-pointer">
                            <polyline
                                points={getPolyString(path.points.map(p => ({x: p.x + 10000, y: p.y + 10000})))}
                                fill="none" stroke={selectedId === path.id ? '#ea580c' : '#f97316'} strokeWidth={selectedId === path.id ? 6 : 4}
                                strokeDasharray="10,5" className="drop-shadow-md"
                            />
                            
                            {/* Path Number Circle (Always Visible) */}
                            {path.points.length > 0 && (
                                <g transform={`translate(${path.points[0].x + 10000}, ${path.points[0].y + 10000})`}>
                                    <circle r="10" fill="#c2410c" stroke="white" strokeWidth="2" />
                                    <text textAnchor="middle" dy="4" fontSize="12" fill="white" fontWeight="bold">
                                        {idx + 1}
                                    </text>
                                </g>
                            )}

                            {/* Static Info Label on Path Start (Dist + Time) - Offset slightly to avoid circle */}
                            {path.points.length > 0 && !isSimulating && (
                                <g transform={`translate(${path.points[0].x + 10000}, ${path.points[0].y + 10000 - 30})`}>
                                    {/* Tooltip Box */}
                                    <rect x="-30" y="-18" width="60" height="28" rx="4" fill="white" fillOpacity="0.95" stroke="#ea580c" strokeWidth="1"/>
                                    
                                    {/* Distance */}
                                    <text textAnchor="middle" y="-4" fontSize="10" fill="#ea580c" fontWeight="bold">
                                        {stats.dist}m
                                    </text>
                                    
                                    {/* Time */}
                                    <text textAnchor="middle" y="6" fontSize="9" fill="#64748b">
                                        {formatTime(stats.time)}
                                    </text>
                                </g>
                            )}
                        </g>
                    )})}

                    {/* Simulation Layer - Truck & Live Stats */}
                    {isSimulating && paths.map((path, idx) => {
                        const truckPos = getTruckPosition(path.points, simulationProgress);
                        if (!truckPos) return null;
                        
                        return (
                            <g key={`sim-${path.id}`} transform={`translate(${truckPos.x + 10000}, ${truckPos.y + 10000})`}>
                                {/* Rotate truck body */}
                                <g transform={`rotate(${truckPos.angle})`}>
                                    <rect x="-14" y="-7" width="28" height="14" fill="#ea580c" rx="2" stroke="white" strokeWidth="1.5" className="drop-shadow-lg"/>
                                    <rect x="14" y="-7" width="8" height="14" fill="#1e293b" rx="1" stroke="white" strokeWidth="1"/>
                                </g>
                                {/* Floating Label */}
                                <g transform="translate(0, -20)">
                                    <rect x="-35" y="-14" width="70" height="28" rx="4" fill="white" fillOpacity="0.9" stroke="#ea580c" strokeWidth="1"/>
                                    <text textAnchor="middle" y="-2" fontSize="10" fill="#ea580c" fontWeight="bold">
                                        {Math.round(truckPos.dist * PIXELS_TO_METERS)}m
                                    </text>
                                    <text textAnchor="middle" y="8" fontSize="8" fill="#64748b">
                                        Path {idx + 1}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                 </svg>

                 {/* 3. Text/Icon Overlay */}
                 {zones.map(zone => {
                    const typeInfo = Object.values(ZONE_TYPES).find(t => t.id === zone.type);
                    let cx, cy;
                    
                    if (zone.shape === 'rect') {
                        cx = zone.x + zone.width/2;
                        cy = zone.y + zone.height/2;
                        if(zone.width < 30 || zone.height < 30) return null;
                    } else {
                        const center = getCentroid(zone.points);
                        cx = center.x;
                        cy = center.y;
                    }
                    
                    return (
                        <div key={'lbl-'+zone.id} className="absolute pointer-events-none flex flex-col items-center" 
                            style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)' }}>
                            <div className="bg-white/70 backdrop-blur-sm rounded-full p-1 shadow-sm">
                                <span className="text-xl drop-shadow-sm filter">{typeInfo?.icon}</span>
                            </div>
                        </div>
                    )
                 })}
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}