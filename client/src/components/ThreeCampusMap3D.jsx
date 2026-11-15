import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Building2, 
  MapPin, 
  Footprints, 
  Navigation, 
  Maximize2, 
  RotateCcw, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';

export default function ThreeCampusMap3D({ 
  selectedBuilding, 
  onSelectBuilding,
  destinations 
}) {
  const containerRef = useRef(null);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingMeshesRef = useRef([]);
  const routeLineRef = useRef(null);

  // College Buildings Data with 3D scene positions & heights
  const buildings3D = [
    {
      id: 1,
      code: "ADMIN",
      name: "Main Admin Block",
      subName: "Principal Room & Office",
      x: -45,
      z: 30,
      width: 28,
      depth: 22,
      height: 14,
      floors: 2,
      category: "Office",
      color: 0x0284c7,
      description: "Houses Principal's Chamber, Administrative Registry, and Examination Cell."
    },
    {
      id: 2,
      code: "BLOCK_A",
      name: "Academic Block A",
      subName: "HOD Chambers & Classrooms",
      x: -40,
      z: -30,
      width: 32,
      depth: 24,
      height: 18,
      floors: 3,
      category: "Academic",
      color: 0x06b6d4,
      description: "Department heads for CSE and ECE, tutorial halls, and faculty rooms."
    },
    {
      id: 3,
      code: "CSE_BLOCK",
      name: "CSE Block (Lab - 1)",
      subName: "Advanced Computer Labs",
      x: 35,
      z: -35,
      width: 36,
      depth: 26,
      height: 20,
      floors: 3,
      category: "Laboratory",
      color: 0x00f2fe,
      description: "Houses high-performance computing labs, AI/ML center, and server racks."
    },
    {
      id: 4,
      code: "BLOCK_B",
      name: "Academic Block B",
      subName: "Classroom 201 & Lecture Halls",
      x: 10,
      z: -10,
      width: 30,
      depth: 22,
      height: 16,
      floors: 2,
      category: "Classroom",
      color: 0x2563eb,
      description: "Smart digital classrooms equipped with interactive displays and acoustics."
    },
    {
      id: 6,
      code: "LIBRARY",
      name: "Central Library & Digital Wing",
      subName: "Study Hall & E-Resources",
      x: -5,
      z: 35,
      width: 26,
      depth: 26,
      height: 15,
      floors: 2,
      category: "Library",
      color: 0x38bdf8,
      description: "VTU Consortium digital library, 20,000+ technical volumes, and reading hall."
    },
    {
      id: 7,
      code: "CANTEEN",
      name: "Campus Canteen",
      subName: "Cafeteria & Dining Hall",
      x: 50,
      z: 30,
      width: 28,
      depth: 24,
      height: 11,
      floors: 1,
      category: "Canteen",
      color: 0x10b981,
      description: "Hygienic campus cafeteria with priority faculty counter and student pre-booking."
    },
    {
      id: 10,
      code: "AUDITORIUM",
      name: "Dr. A.P.J. Kalam Auditorium",
      subName: "Events & Cultural Arena",
      x: -80,
      z: 0,
      width: 34,
      depth: 28,
      height: 22,
      floors: 2,
      category: "Auditorium",
      color: 0x6366f1,
      description: "600-seater air-conditioned auditorium for seminars, convocations, and fests."
    },
    {
      id: 11,
      code: "PARKING",
      name: "Campus EV Parking Zone",
      subName: "Student & Staff Parking",
      x: 15,
      z: 75,
      width: 40,
      depth: 18,
      height: 2,
      floors: 1,
      category: "Facility",
      color: 0x475569,
      description: "Spacious shaded vehicle parking with 4 active EV two-wheeler charging bays."
    }
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060b18);
    scene.fog = new THREE.FogExp2(0x060b18, 0.0035);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      1000
    );
    camera.position.set(0, 110, 150);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.2);
    dirLight.position.set(60, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x2563eb, 2, 250);
    blueLight.position.set(-50, 40, -50);
    scene.add(blueLight);

    // Ground Plane with Cyber Grid
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x071126,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(280, 28, 0x00f2fe, 0x0e2849);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);

    // Walkway Roads & Campus Pathways
    const pathwayMat = new THREE.MeshBasicMaterial({ color: 0x0b1c38, transparent: true, opacity: 0.85 });
    
    // Main Spine Avenue
    const mainAvenue = new THREE.Mesh(new THREE.PlaneGeometry(16, 240), pathwayMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.position.set(0, 0.15, 0);
    scene.add(mainAvenue);

    // Cross Boulevard
    const crossBoulevard = new THREE.Mesh(new THREE.PlaneGeometry(240, 14), pathwayMat);
    crossBoulevard.rotation.x = -Math.PI / 2;
    crossBoulevard.position.set(0, 0.16, 5);
    scene.add(crossBoulevard);

    // Main Campus Entrance Gate Marker
    const gateGeo = new THREE.CylinderGeometry(4, 4, 2, 16);
    const gateMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 1, 95);
    scene.add(gate);

    // Create 3D Building Meshes
    buildingMeshesRef.current = [];

    buildings3D.forEach((b) => {
      // Building Box
      const geo = new THREE.BoxGeometry(b.width, b.height, b.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.height / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = b;

      // Neon Wireframe Edge Highlight
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ 
        color: 0x00f2fe, 
        linewidth: 2,
        transparent: true,
        opacity: 0.7
      });
      const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(wireframe);

      // Floor separator bands
      for (let f = 1; f < b.floors; f++) {
        const floorY = (b.height / b.floors) * f - b.height / 2;
        const bandGeo = new THREE.BoxGeometry(b.width + 0.4, 0.4, b.depth + 0.4);
        const bandMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = floorY;
        mesh.add(band);
      }

      scene.add(mesh);
      buildingMeshesRef.current.push(mesh);
    });

    // Mouse Interaction: Orbit & Raycasting
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let cameraAngle = { theta: 0, phi: Math.PI / 4, radius: 180 };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;

        cameraAngle.theta -= deltaX * 0.006;
        cameraAngle.phi = Math.max(0.15, Math.min(Math.PI / 2.2, cameraAngle.phi - deltaY * 0.006));

        prevMousePos = { x: e.clientX, y: e.clientY };
        updateCamera();
      } else {
        // Hover Raycast
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(buildingMeshesRef.current);
        if (intersects.length > 0) {
          container.style.cursor = 'pointer';
          setHoveredBuilding(intersects[0].object.userData);
        } else {
          container.style.cursor = 'grab';
          setHoveredBuilding(null);
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(buildingMeshesRef.current);
      if (intersects.length > 0) {
        const buildingData = intersects[0].object.userData;
        onSelectBuilding(buildingData);
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      cameraAngle.radius = Math.max(70, Math.min(260, cameraAngle.radius + e.deltaY * 0.12));
      updateCamera();
    };

    const updateCamera = () => {
      camera.position.x = cameraAngle.radius * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
      camera.position.y = cameraAngle.radius * Math.cos(cameraAngle.phi);
      camera.position.z = cameraAngle.radius * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
      camera.lookAt(0, 8, 0);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Pulse active building pin & highlight
      buildingMeshesRef.current.forEach((mesh) => {
        const isTarget = selectedBuilding && (
          mesh.userData.id === selectedBuilding.id ||
          selectedBuilding.name?.toLowerCase().includes(mesh.userData.name.toLowerCase()) ||
          selectedBuilding.building?.toLowerCase().includes(mesh.userData.name.toLowerCase())
        );

        if (isTarget) {
          mesh.material.emissive = new THREE.Color(0x00f2fe);
          mesh.material.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 4) * 0.25;
        } else {
          mesh.material.emissive = new THREE.Color(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onClick);
      container.removeEventListener('wheel', onWheel);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, []);

  // Update Dynamic 3D Neon Route Tube when target building changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old route line
    if (routeLineRef.current) {
      scene.remove(routeLineRef.current);
      routeLineRef.current.geometry.dispose();
      routeLineRef.current.material.dispose();
      routeLineRef.current = null;
    }

    if (!selectedBuilding) return;

    // Find destination target coord
    const targetMesh = buildingMeshesRef.current.find(m => 
      m.userData.id === selectedBuilding.id ||
      selectedBuilding.name?.toLowerCase().includes(m.userData.name.toLowerCase()) ||
      selectedBuilding.building?.toLowerCase().includes(m.userData.name.toLowerCase())
    );

    const targetPos = targetMesh ? targetMesh.position : new THREE.Vector3(35, 10, -35);

    // Create 3D curve from entrance (0, 1, 95) -> Spine (0, 1, 5) -> Branch target
    const points = [
      new THREE.Vector3(0, 1.5, 95),
      new THREE.Vector3(0, 1.5, 30),
      new THREE.Vector3(0, 1.5, targetPos.z),
      new THREE.Vector3(targetPos.x, 1.5, targetPos.z),
      new THREE.Vector3(targetPos.x, targetPos.y + 4, targetPos.z)
    ];

    const curve = new THREE.CatmullRomCurve3(points, false, 'chordal', 0.2);
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 1.2, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.85
    });

    const routeTube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(routeTube);
    routeLineRef.current = routeTube;

  }, [selectedBuilding]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl bg-[#060e20]/90 backdrop-blur-md border border-cyan-400/50 text-cyan-300 text-xs font-bold shadow-[0_0_20px_rgba(0,242,254,0.3)] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>3D WebGL Spatial Campus Model</span>
        </div>
        <div className="hidden sm:inline-flex px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-slate-400 text-[11px] border border-cyan-500/20">
          Drag to Orbit • Scroll to Zoom • Click Building
        </div>
      </div>

      {/* Hovered Building Tooltip */}
      {hoveredBuilding && (
        <div className="absolute bottom-16 left-4 z-10 p-3 rounded-2xl bg-[#08152e]/95 backdrop-blur-xl border border-cyan-400/60 shadow-[0_0_25px_rgba(0,242,254,0.4)] text-left max-w-xs animate-fade-in pointer-events-none">
          <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-xs">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{hoveredBuilding.name}</span>
          </div>
          <div className="text-[11px] text-white font-semibold mt-0.5">{hoveredBuilding.subName}</div>
          <div className="text-[10px] text-slate-300 mt-1">{hoveredBuilding.description}</div>
          <div className="text-[9px] text-cyan-400 font-mono mt-1">Click to lock destination &amp; plot route</div>
        </div>
      )}

      {/* Reset Camera Button */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 110, 150);
              cameraRef.current.lookAt(0, 5, 0);
            }
          }}
          className="p-2 rounded-xl bg-[#09162e]/90 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/30 text-xs font-bold shadow-lg transition-all"
          title="Reset 3D Perspective"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Origin & Target Legend */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 bg-[#060e20]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 text-[10px]">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Entrance</span>
        </div>
        <span className="text-slate-500">→</span>
        <div className="flex items-center gap-1.5 text-red-400 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span>{selectedBuilding?.name || "Target"}</span>
        </div>
      </div>
    </div>
  );
}

