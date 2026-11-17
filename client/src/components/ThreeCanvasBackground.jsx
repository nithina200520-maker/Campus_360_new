import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeCanvasBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Subtle Particle Constellation Network
    const particleCount = 70;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 350;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;

      velocities.push({
        x: (Math.random() - 0.5) * 0.15,
        y: (Math.random() - 0.5) * 0.15,
        z: (Math.random() - 0.5) * 0.1
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle material with cyan glow
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 3,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // Floating Geometric 3D Polyhedra (Cyan wireframe dodecahedron)
    const polyGeometry = new THREE.IcosahedronGeometry(22, 1);
    const polyMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const polyhedron1 = new THREE.Mesh(polyGeometry, polyMaterial);
    polyhedron1.position.set(-110, 50, -50);
    scene.add(polyhedron1);

    const polyGeometry2 = new THREE.TorusGeometry(18, 2.5, 8, 24);
    const polyMaterial2 = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const polyhedron2 = new THREE.Mesh(polyGeometry2, polyMaterial2);
    polyhedron2.position.set(120, -40, -40);
    scene.add(polyhedron2);

    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Animate particles
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        if (pos[i * 3] > 180 || pos[i * 3] < -180) velocities[i].x *= -1;
        if (pos[i * 3 + 1] > 110 || pos[i * 3 + 1] < -110) velocities[i].y *= -1;
        if (pos[i * 3 + 2] > 80 || pos[i * 3 + 2] < -80) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;

      // Animate 3D wireframe geometries
      polyhedron1.rotation.x += 0.003;
      polyhedron1.rotation.y += 0.004;

      polyhedron2.rotation.x -= 0.002;
      polyhedron2.rotation.y += 0.005;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      particleMaterial.dispose();
      polyGeometry.dispose();
      polyMaterial.dispose();
      polyGeometry2.dispose();
      polyMaterial2.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" 
      aria-hidden="true" 
    />
  );
}

