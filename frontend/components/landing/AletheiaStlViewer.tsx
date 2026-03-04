"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

interface AletheiaStlViewerProps {
  className?: string;
  modelUrl?: string;
}

export function AletheiaStlViewer({
  className = "",
  modelUrl = "/models/aletheia-statue.stl",
}: AletheiaStlViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const host = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    camera.position.set(0, 10, 26);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth || 520, host.clientHeight || 620);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(8, 14, 10);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe7ebff, 0.7);
    fill.position.set(-8, 6, 8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(0, 10, -12);
    scene.add(rim);

    const ambient = new THREE.AmbientLight(0xf4f6ff, 0.55);
    scene.add(ambient);

    const group = new THREE.Group();
    scene.add(group);

    let statue: THREE.Mesh | null = null;
    let raf = 0;
    let disposed = false;
    let lastScrollY = 0;
    let targetYaw = 0;

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScrollY;
      lastScrollY = y;
      targetYaw += dy * 0.006;
    };

    const onResize = () => {
      if (!mountRef.current) return;
      const w = Math.max(360, mountRef.current.clientWidth);
      const h = Math.max(420, mountRef.current.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const loader = new STLLoader();
    loader.load(
      modelUrl,
      (geometry) => {
        if (disposed) return;

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        geometry.center();

        const bounds = geometry.boundingBox;
        const size = bounds
          ? new THREE.Vector3(
              bounds.max.x - bounds.min.x,
              bounds.max.y - bounds.min.y,
              bounds.max.z - bounds.min.z
            )
          : new THREE.Vector3(1, 1, 1);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 14 / maxDim;

        const mat = new THREE.MeshStandardMaterial({
          color: 0xd9dde6,
          metalness: 0.18,
          roughness: 0.42,
        });

        statue = new THREE.Mesh(geometry, mat);
        statue.scale.setScalar(scale);
        // STL is Z-up; rotate to Y-up so it stands upright.
        statue.rotation.x = -Math.PI / 2;
        statue.position.y = -2.2;
        group.add(statue);

        onResize();

        const tick = () => {
          if (disposed) return;
          if (statue) {
            // Yaw-only rotation: rotate around vertical axis based on scroll input.
            statue.rotation.y += (targetYaw - statue.rotation.y) * 0.1;
            statue.rotation.x = -Math.PI / 2;
            statue.rotation.z = 0;
            statue.position.y = -2.2;
          }
          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
      },
      undefined,
      () => {
        if (!disposed) setFailed(true);
      }
    );

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    lastScrollY = window.scrollY;
    targetYaw = 0;
    onResize();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [modelUrl]);

  return (
    <div className={`relative mx-auto w-full max-w-[560px] ${className}`}>
      <div className="relative">
        {failed ? (
          <div className="h-[620px] flex items-center justify-center text-sm text-gray-500">
            Failed to load STL model.
          </div>
        ) : (
          <div ref={mountRef} className="h-[620px] overflow-hidden" />
        )}
      </div>
      <div className="absolute inset-x-14 -bottom-1 h-10 bg-black/15 blur-2xl rounded-full" />
    </div>
  );
}
