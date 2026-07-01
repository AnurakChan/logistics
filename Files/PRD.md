PRD: EV Logistics Terminal Simulator

Product Requirement Document สำหรับ Vibe Coding
Version: 1.0 | Date: 2025-02-06
Author: System Analyst Team | Stakeholder: Dutchy (IT & Cyber Security Director)


1. Product Overview
1.1 ชื่อโปรเจค
EV Logistics Terminal Simulator (EVLTS)
1.2 วัตถุประสงค์
Web Application สำหรับออกแบบและจำลองการทำงานของสถานีรถบรรทุกไฟฟ้า (EV Logistics Terminal) บนแผนที่จริง ให้ผู้ใช้สามารถวาง object ต่างๆ วาดเส้นทาง และ simulate การวิ่งของรถบรรทุกทั้งแบบ 2D และ 3D เพื่อวิเคราะห์ประสิทธิภาพของ layout สถานีก่อนก่อสร้างจริง
1.3 Target Users

ผู้บริหาร / ผู้จัดการโรงไฟฟ้าชีวมวล
วิศวกรออกแบบ Logistics Terminal
ทีม Operation & Planning

1.4 ปรัชญาการออกแบบ

One Page App — ไม่มีการเปลี่ยนหน้า ทุกอย่างอยู่ในหน้าเดียว
Fast & Simple — โหลดไว ใช้งานง่าย ไม่ซับซ้อน
Beautiful & Minimal — สวยงาม โทนสี ส้ม/แดง/ขาว


2. Tech Stack
2.1 Frontend Framework
ComponentLibraryVersionLicenseเหตุผลUI FrameworkReact 18+^18.2MITตาม requirementBuild ToolVite^5.xMITเร็วกว่า CRA มากState ManagementZustand^4.xMITเบา เร็ว ง่ายกว่า ReduxUI ComponentsRadix UI + Tailwind CSSlatestMITMinimal, accessibleIconsLucide ReactlatestISCFree, ครบ, สวย
2.2 Map & Geospatial
ComponentLibraryเหตุผลMap EngineMapLibre GL JS (react-map-gl + maplibre-gl)Open-source fork ของ Mapbox, ฟรี 100%, รองรับ 3D terrain, rotate, tiltMap Tiles (แผนที่)OpenStreetMap via Carto/Stadia tilesฟรี, ไม่ต้อง API keyMap Tiles (ดาวเทียม)ESRI World Imagery หรือ Maptiler Satellite (free tier)ภาพดาวเทียมฟรีGeo CalculationTurf.jsคำนวณระยะทาง, bearing, interpolation
2.3 3D Simulation
ComponentLibraryเหตุผล3D EngineThree.js via @react-three/fiber✅ เลือกให้ — ecosystem ใหญ่สุด, community แข็งแกร่ง, ตัวอย่างเยอะ3D Helpers@react-three/dreiHelper components สำเร็จรูป3D on Mapthreebox-plugin หรือ Custom MapLibre Layerวาง Three.js object บน MapLibre3D ModelsBuilt-in geometry (Box, Cylinder) + optional GLTFรถบรรทุก, สถานี
2.4 Drawing & Interaction
ComponentLibraryเหตุผลDrawing on MapMapLibre Draw (@mapbox/mapbox-gl-draw compatible)วาด polygon, line, point บนแผนที่Drag & ResizeCustom handlers on MapLibre sources/layersลาก, ยืด objectRoute DrawingGeoJSON LineString via MapLibreวาดเส้นทาง
2.5 Utilities
ComponentLibraryเหตุผลXML Export/Importfast-xml-parserเร็ว, เบา, ไม่มี dependencyAnimationGSAP (free) หรือ requestAnimationFrameควบคุม animation ละเอียดNotificationsSonner (toast)Toast notification สวย minimalUUIDnanoidสร้าง unique ID ให้ object

3. Design System
3.1 Color Palette
Primary Orange  : #FF6B35  (ปุ่มหลัก, Accent)
Primary Red     : #D32F2F  (Warning, Critical)
Dark Red        : #B71C1C  (Hover states)
White           : #FFFFFF  (Background หลัก)
Off-White       : #FAFAFA  (Background รอง)
Light Gray      : #F5F5F5  (Card background)
Medium Gray     : #9E9E9E  (Secondary text)
Dark Gray       : #212121  (Primary text)
Orange Light    : #FFF3E0  (Highlight, Selected state)
Red Light       : #FFEBEE  (Alert background)
3.2 Typography

Font: Inter (Google Fonts, free) — อ่านง่าย ทั้งภาษาไทยและอังกฤษ
Fallback: "Noto Sans Thai", sans-serif
ขนาด: 14px base, 12px small, 16px heading

3.3 Layout Concept
┌─────────────────────────────────────────────────────────┐
│  🔶 EVLTS Logo    [Map/Satellite]  [2D/3D]   [⚙ Menu] │  ← Top Bar (48px)
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│ TOOL   │                                                │
│ PANEL  │              MAP VIEWPORT                      │
│        │           (Main Canvas Area)                   │
│ ------─│                                                │
│ Object │                                                │
│ List   │                                                │
│        │                                                │
│ ------─│                                                │
│ Props  │                                                │
│ Panel  │                                                │
│        ├────────────────────────────────────────────────┤
│        │  ▶ ⏸ ⏹  ◀◀ ▶▶  Speed:[1x ▼]  ⏱ 00:00:00    │  ← Simulation Bar
└────────┴────────────────────────────────────────────────┘
3.4 UI Principles

Sidebar ซ้าย: แคบ (280px) แบบ collapsible
แผนที่: เต็มจอ เป็น main focus
Floating panels: ใช้ glassmorphism (backdrop-blur)
Transitions: smooth 200ms ease
Drag & Drop: ลาก object จาก sidebar ลงแผนที่


4. Feature Specifications
4.1 🗺️ Map Viewport (Core)
FR-MAP-001: แสดงแผนที่ OpenStreetMap

ใช้ MapLibre GL JS render แผนที่
Default center: พิกัดประเทศไทย (13.7563, 100.5018)
Default zoom: 15 (ระดับสถานี)
รองรับ pinch-to-zoom บน mobile

FR-MAP-002: Map Controls

Zoom in/out (ปุ่ม + scroll wheel + pinch)
Rotate map (right-click drag หรือ 2-finger rotate)
Tilt/Pitch (สำหรับ 3D perspective)
Compass indicator แสดงทิศเหนือ
Reset view button

FR-MAP-003: สลับ Map Style

Toggle button: แผนที่ ↔ ดาวเทียม
แผนที่: OpenStreetMap style (Carto Positron หรือ Stadia)
ดาวเทียม: ESRI World Imagery
Transition: smooth fade 300ms

FR-MAP-004: Geocoder Search

ช่องค้นหาสถานที่ (ใช้ Nominatim API — OSM geocoder ฟรี)
พิมพ์ชื่อสถานที่ แล้ว fly-to ตำแหน่งนั้น
ใช้สำหรับหาพิกัดสถานีจริงที่ต้องการวาง layout


4.2 🏗️ Object Placement (Terminal Layout)
FR-OBJ-001: Object Types
IDObject Name (TH)Object Name (EN)IconDefault SizeColorchargingสถานีชาร์จCharging Station⚡8m × 4m🟢 Greenbattery_swapสถานีสลับแบตBattery Swap Station🔋10m × 6m🔵 Bluetrailer_parkจุดวางหางลากTrailer Parking🅿️12m × 3.5m🟡 Yellowtruck_headจุดวางหัวลากTruck Head Parking🚛8m × 3.5m🟠 Orangemaintenanceจุดซ่อมรถMaintenance Bay🔧10m × 8m🔴 Redrest_areaจุดพักผู้โดยสารRest Area🧑‍🤝‍🧑6m × 6m🟣 PurpleboundaryขอบเขตสถานีStation Boundary🔲Custom⬜ White/Dashed
FR-OBJ-002: วาง Object

Drag จาก Tool Panel (sidebar ซ้าย) → Drop ลงบนแผนที่
Object ถูกวางเป็น GeoJSON Polygon บนแผนที่
แสดง label + icon ของ object type
Snap-to-grid option (เปิด/ปิดได้)

FR-OBJ-003: ยืด/ขยาย/หมุน Object

Click เลือก object → แสดง resize handles (8 จุด)
ลากมุม → ยืด/ขยาย proportional หรือ free
ลาก edge → ยืดด้านเดียว
Rotation handle (วงกลมด้านบน) → หมุนองศา
แสดงขนาดจริง (เมตร) ขณะ resize
กด Delete key → ลบ object

FR-OBJ-004: Object Properties Panel

เมื่อเลือก object แสดง properties ที่ sidebar:

ชื่อ (editable)
ประเภท
ขนาด (กว้าง × ยาว เมตร) — editable
พิกัด (lat, lng)
มุมหมุน (degrees)
จำนวนช่อง/capacity (สำหรับ charging, battery_swap)
สี (color picker)
หมายเหตุ (notes)



FR-OBJ-005: Object List

แสดงรายการ object ทั้งหมดที่วางบนแผนที่
Click → fly to + select object
ลาก → จัด layer order
Toggle visibility (ซ่อน/แสดง)
Group by type


4.3 🛣️ Route Drawing (เส้นทางรถ)
FR-ROUTE-001: วาดเส้นทาง

เลือก tool "Draw Route" จาก toolbar
Click จุดบนแผนที่ทีละจุด → สร้าง polyline
Double-click หรือกด Enter → จบเส้นทาง
เส้นทางเป็น directional (มีลูกศรแสดงทิศทาง)
แสดงระยะทางรวม (เมตร/กิโลเมตร)

FR-ROUTE-002: แก้ไขเส้นทาง

Click บนเส้น → แสดง control points (nodes)
ลาก node → เปลี่ยนตำแหน่ง
Click กลางเส้น → เพิ่ม node ใหม่
Right-click node → ลบ node
เส้นจะ smooth interpolation (Bezier curve option)

FR-ROUTE-003: Route Properties

ชื่อเส้นทาง (editable)
สี (แต่ละเส้นต่างสี — auto assign)
ความกว้างถนน (เมตร)
ทิศทาง: ทางเดียว / สองทาง
ระยะทางรวม (คำนวณอัตโนมัติ จาก Turf.js)
ความเร็วรถ (km/h) — กำหนดได้ต่อเส้นทาง (default: 20 km/h)

FR-ROUTE-004: กำหนดความเร็วรถ

Input field: ความเร็วเป็น km/h (range: 5–80 km/h)
แสดง estimated travel time อัตโนมัติ = ระยะทาง ÷ ความเร็ว
สามารถกำหนดความเร็วแตกต่างกันในแต่ละ segment ของเส้นทางได้
Visual indicator: สีเส้นเปลี่ยนตามความเร็ว (เขียว=เร็ว, แดง=ช้า)


4.4 🚛 Simulation Engine
FR-SIM-001: 2D Simulation

รถบรรทุกแสดงเป็น icon/marker บนแผนที่ MapLibre
เคลื่อนที่ตามเส้นทาง (FR-ROUTE) ด้วยความเร็วที่กำหนด
รถหมุนตาม bearing ของเส้นทาง (หันหัวไปทิศที่วิ่ง)
แสดง trail/trace เส้นทางที่ผ่านมา (fade out)
รองรับหลายคันพร้อมกัน (≥10 คัน) — ★ ข้อเสนอแนะเพิ่ม

FR-SIM-002: 3D Simulation

กดปุ่ม toggle "2D ↔ 3D"
โหมด 3D: Map tilt 60° + Three.js overlay
รถบรรทุกแสดงเป็น 3D model (built-in low-poly geometry):

หัวลาก: Box + Cylinder wheels
หางลาก: Box ยาว
สถานีต่างๆ: Extruded polygon จาก layout


Camera controls: orbit, zoom, pan (Three.js OrbitControls)
Lighting: Ambient + Directional (เงาจริง)
Ground plane: แสดง texture แผนที่ลงบนพื้น

FR-SIM-003: Playback Controls
[ ▶ Play ] [ ⏸ Pause ] [ ⏹ Stop ] [ ◀◀ Rewind ] [ ▶▶ Forward ]
Speed: [ 0.5x | 1x | 2x | 5x | 10x ]
Time: 00:00:00 / 00:05:32
Progress: ═══════════●──────── 45%

Play: เริ่ม/ต่อ simulation
Pause: หยุดชั่วคราว (รถหยุดอยู่กับที่)
Stop: หยุด + reset กลับจุดเริ่มต้น
Rewind/Forward: ข้ามไป ±10 วินาที
Speed control: ปรับความเร็ว playback (ไม่ใช่ความเร็วรถ)
Timeline slider: ลากไปเวลาที่ต้องการ
★ ข้อเสนอแนะเพิ่ม

FR-SIM-004: สรุปผล Simulation

แสดง Floating Panel ขณะ/หลัง simulation:

⏱ เวลาเดินทางรวม: XX นาที XX วินาที (ต่อคัน)
📏 ระยะทางรวม: XX กม.
🚛 ความเร็วเฉลี่ย: XX km/h
⚡ เวลาชาร์จโดยประมาณ: XX นาที (ถ้าผ่านสถานีชาร์จ)
📊 Throughput: XX คัน/ชั่วโมง — ★ ข้อเสนอแนะเพิ่ม
📈 Station Utilization: ชาร์จ XX%, สลับแบต XX% — ★ ข้อเสนอแนะเพิ่ม




4.5 🚦 Multi-Truck & Queue Simulation ★ (ข้อเสนอแนะเพิ่ม)
FR-MULTI-001: Multi-Truck Setup

กำหนดจำนวนรถบรรทุกที่จะ simulate (1–20 คัน)
แต่ละคันกำหนดได้:

เส้นทางที่ใช้
เวลาเริ่มต้น (offset)
ความเร็ว (override จาก route default)
สี (auto assign เพื่อแยกแต่ละคัน)



FR-MULTI-002: Queue Management

เมื่อรถถึงสถานีชาร์จ/สลับแบต → ตรวจสอบ capacity
ถ้าเต็ม → รถเข้าคิวรอ (แสดงเป็น queue marker)
แสดงเวลารอคิวเฉลี่ย
Service time ต่อคัน: กำหนดได้ (default: ชาร์จ 30 นาที, สลับแบต 5 นาที)

FR-MULTI-003: Collision Detection ★

ตรวจจับเมื่อรถ 2 คัน อยู่ในตำแหน่งใกล้กันเกินไป (< 3 เมตร)
แสดง warning icon ⚠️ ณ จุดที่ชน
บันทึก collision log: เวลา, ตำแหน่ง, คันที่เกี่ยวข้อง
แสดงในสรุปผล simulation


4.6 📊 Dashboard & KPI ★ (ข้อเสนอแนะเพิ่ม)
FR-DASH-001: Live Dashboard (Floating Panel)

แสดงระหว่าง simulation:

จำนวนรถที่กำลังวิ่ง / รอคิว / เสร็จแล้ว
Throughput (คันที่เสร็จรอบ / ชม.)
Average cycle time
Station utilization (แบบ progress bar)
Queue length ต่อสถานี



FR-DASH-002: Post-Simulation Report

หลัง simulation จบ แสดง summary:

ตาราง: เวลาต่อคัน, ระยะทางต่อคัน
กราฟ: Timeline ของแต่ละคัน (Gantt-style)
Bottleneck identification: จุดไหนรถรอนานที่สุด
คำแนะนำ: เช่น "ควรเพิ่มสถานีชาร์จ 1 ช่อง"




4.7 💾 Export / Import (XML)
FR-IO-001: Export to XML

ปุ่ม "Export" บน Top Bar
Export ข้อมูลทั้งหมดเป็น XML:

xml  <?xml version="1.0" encoding="UTF-8"?>
  <EVLTSProject version="1.0" created="2025-02-06T10:00:00Z">
    <metadata>
      <name>สถานีชาร์จ A</name>
      <author>Dutchy</author>
      <center lat="13.7563" lng="100.5018" zoom="15"/>
    </metadata>
    <objects>
      <object id="obj_001" type="charging" name="สถานีชาร์จ #1">
        <geometry type="Polygon">
          <coordinates>[[100.501,13.756],[100.502,13.756],...]</coordinates>
        </geometry>
        <properties width="8" height="4" rotation="45" capacity="4"/>
      </object>
      <!-- ... more objects -->
    </objects>
    <routes>
      <route id="route_001" name="เส้นทางหลัก" speed_kmh="20" direction="oneway">
        <geometry type="LineString">
          <coordinates>[[100.501,13.756],[100.503,13.758],...]</coordinates>
        </geometry>
      </route>
    </routes>
    <simulation>
      <trucks count="5">
        <truck id="truck_001" route="route_001" speed_kmh="20" start_offset_sec="0"/>
      </trucks>
      <settings playback_speed="1" queue_enabled="true"/>
    </simulation>
  </EVLTSProject>
FR-IO-002: Import from XML

ปุ่ม "Import" บน Top Bar
เลือกไฟล์ .xml → parse → วาดทุกอย่างกลับบนแผนที่
Validation: ตรวจสอบ schema ก่อน import
Merge option: เพิ่มเข้ากับ layout ปัจจุบัน หรือ replace ทั้งหมด
Error handling: แจ้ง toast ถ้า file ไม่ถูก format

FR-IO-003: Auto-save (Local)

Auto-save project state ทุก 30 วินาที ลง browser localStorage
เมื่อเปิดแอพใหม่ → ถามว่าจะ restore งานเก่าหรือไม่


5. Non-Functional Requirements
5.1 Performance
MetricTargetFirst Contentful Paint< 1.5 วินาทีMap Load Time< 2 วินาทีSimulation FPS (2D, 10 trucks)≥ 30 fpsSimulation FPS (3D, 10 trucks)≥ 24 fpsMax Objects on Map≥ 100Max Concurrent Trucks≥ 20
5.2 Browser Support

Chrome 90+ (primary)
Firefox 90+
Edge 90+
Safari 15+
Mobile: Chrome/Safari (responsive, แต่เน้น Desktop)

5.3 Responsive Design

Desktop first (≥1280px) — full experience
Tablet (768–1279px) — sidebar collapse เป็น drawer
Mobile (<768px) — basic view only, แนะนำใช้ desktop

5.4 Accessibility

Keyboard navigation สำหรับ toolbar
High contrast mode (optional toggle)
Tooltip ทุกปุ่ม


6. Project Structure (แนะนำ)
evlts/
├── public/
│   ├── models/              # 3D models (GLTF) — ถ้ามี
│   └── icons/               # Object icons (SVG)
├── src/
│   ├── main.jsx             # Entry point
│   ├── App.jsx              # Root component
│   ├── stores/
│   │   ├── useMapStore.js       # Map state (Zustand)
│   │   ├── useObjectStore.js    # Objects state
│   │   ├── useRouteStore.js     # Routes state
│   │   └── useSimulationStore.js # Simulation state
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── SimulationBar.jsx
│   │   ├── map/
│   │   │   ├── MapView.jsx          # MapLibre viewport
│   │   │   ├── MapControls.jsx      # Zoom, rotate, style toggle
│   │   │   ├── ObjectLayer.jsx      # Render objects on map
│   │   │   ├── RouteLayer.jsx       # Render routes on map
│   │   │   └── TruckMarker.jsx      # 2D truck animation
│   │   ├── three/
│   │   │   ├── Scene3D.jsx          # Three.js scene
│   │   │   ├── TruckModel.jsx       # 3D truck geometry
│   │   │   ├── StationModel.jsx     # 3D station objects
│   │   │   └── GroundPlane.jsx      # Map texture on ground
│   │   ├── panels/
│   │   │   ├── ToolPanel.jsx        # Object palette (drag source)
│   │   │   ├── ObjectList.jsx       # List of placed objects
│   │   │   ├── PropertiesPanel.jsx  # Selected object properties
│   │   │   ├── RoutePanel.jsx       # Route list & properties
│   │   │   ├── SimulationPanel.jsx  # Truck config, speed
│   │   │   └── DashboardPanel.jsx   # KPI dashboard ★
│   │   └── simulation/
│   │       ├── SimulationEngine.js  # Core logic (tick-based)
│   │       ├── QueueManager.js      # Queue simulation ★
│   │       ├── CollisionDetector.js # Collision check ★
│   │       └── PlaybackControls.jsx # Play/Pause/Speed UI
│   ├── utils/
│   │   ├── xmlExporter.js       # Export to XML
│   │   ├── xmlImporter.js       # Import from XML
│   │   ├── geoUtils.js          # Distance, bearing calc
│   │   └── colorUtils.js        # Auto-assign colors
│   └── styles/
│       └── globals.css          # Tailwind + custom vars
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md

7. User Flows
7.1 Flow: สร้าง Layout ใหม่
เปิดแอพ → แผนที่โหลด → ค้นหาสถานที่ → Zoom เข้า
→ ลาก "ขอบเขตสถานี" วางบนแผนที่ → ยืดให้ครอบคลุมพื้นที่
→ ลาก "สถานีชาร์จ" วาง → ปรับขนาด/ตำแหน่ง
→ ลาก "สถานีสลับแบต" วาง → ปรับ
→ ลาก objects อื่นๆ วาง
→ วาดเส้นทาง → กำหนดความเร็ว
→ Export XML เก็บไว้
7.2 Flow: Simulate
มี Layout พร้อม (หรือ Import XML)
→ กำหนดจำนวนรถ (เช่น 5 คัน)
→ เลือกเส้นทางให้แต่ละคัน
→ กด Play ▶
→ ดู 2D simulation → สลับ 3D ดู
→ ดู Dashboard KPI
→ กด Stop ⏹ → อ่าน Report
→ ปรับ layout → Simulate ใหม่
7.3 Flow: Import งานเก่า
เปิดแอพ → กด Import → เลือกไฟล์ .xml
→ Layout + Routes + Truck config โหลดกลับมา
→ แก้ไข / Simulate ต่อ

8. Development Phases (แนะนำ)
Phase 1 — Foundation (สัปดาห์ 1–2)

 Setup Vite + React + Tailwind
 MapLibre integration (แผนที่ + ดาวเทียม + controls)
 Basic UI layout (TopBar, Sidebar, Map)
 Geocoder search

Phase 2 — Object System (สัปดาห์ 3–4)

 Object types definition
 Drag & Drop จาก sidebar ลง map
 Resize & Rotate handles
 Properties panel
 Object list

Phase 3 — Route System (สัปดาห์ 5)

 Route drawing tool
 Route editing (add/move/delete nodes)
 Speed assignment per route/segment
 Distance calculation

Phase 4 — 2D Simulation (สัปดาห์ 6–7)

 Simulation engine (tick-based)
 2D truck animation on map
 Playback controls
 Travel time calculation
 Multi-truck support
 Basic dashboard

Phase 5 — 3D Simulation (สัปดาห์ 8–9)

 Three.js scene setup
 3D truck models (geometry)
 3D station models
 Map texture on ground plane
 2D ↔ 3D toggle
 Camera controls

Phase 6 — Advanced Features (สัปดาห์ 10–11)

 Queue management simulation
 Collision detection
 KPI dashboard
 Post-simulation report

Phase 7 — Import/Export & Polish (สัปดาห์ 12)

 XML export
 XML import + validation
 Auto-save
 UI polish & responsive
 Performance optimization


9. Dependencies Summary (package.json)
json{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "maplibre-gl": "^4.x",
    "react-map-gl": "^7.x",
    "@mapbox/mapbox-gl-draw": "^1.4.x",
    "@react-three/fiber": "^8.x",
    "@react-three/drei": "^9.x",
    "three": "^0.160.x",
    "@turf/turf": "^7.x",
    "zustand": "^4.x",
    "fast-xml-parser": "^4.x",
    "nanoid": "^5.x",
    "lucide-react": "latest",
    "sonner": "^1.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "@types/mapbox-gl": "latest"
  }
}

✅ ทุก library เป็น open-source และ free ทั้งหมด


10. Risks & Mitigations
RiskImpactMitigation3D performance ช้าบน laptop เก่าสูงให้ 2D เป็น default, 3D เป็น optionalMapLibre + Three.js sync ยากกลางใช้ threebox-plugin หรือ custom WebGL layerSatellite tile ถูก rate limitต่ำCache tiles, ใช้หลาย provider fallbackXML schema เปลี่ยนบ่อยกลางVersion attribute ใน XML, backward compatible parserMulti-truck simulation heavyกลางWeb Worker สำหรับ simulation engine

11. Glossary
คำศัพท์ความหมายEVLTSEV Logistics Terminal Simulatorหัวลากส่วนหัวรถบรรทุกที่มีเครื่องยนต์ (Truck Head / Tractor)หางลากส่วนพ่วงท้ายสำหรับบรรทุกสินค้า (Trailer)Battery Swapการสลับแบตเตอรี่ทั้งชุดแทนการชาร์จThroughputจำนวนรถที่ผ่านรอบได้ต่อหน่วยเวลาCycle Timeเวลาทั้งหมดที่รถใช้ตั้งแต่เข้า-ออกสถานี


📌 หมายเหตุ: PRD นี้ออกแบบมาเพื่อใช้กับ Vibe Coding — แต่ละ Feature Request (FR-xxx) สามารถนำไป prompt AI coding assistant ได้เลย เรียงตาม Development Phase เพื่อให้ build ทีละชิ้นได้ง่าย