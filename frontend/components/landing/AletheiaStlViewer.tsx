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
    camera.position.set(0, 10, 30);
    camera.lookAt(0, -1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth || 520, host.clientHeight || 620);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    // Main light from above with a slight side angle.
    key.position.set(5.5, 18, 8);
    key.target.position.set(0, -1.8, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.00012;
    key.shadow.radius = 2.8;
    scene.add(key);
    scene.add(key.target);

    const fill = new THREE.DirectionalLight(0xf1f3f8, 0.45);
    fill.position.set(-7, 7, 6);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(0, 10, -12);
    scene.add(rim);

    const ambient = new THREE.AmbientLight(0xf4f6ff, 0.55);
    scene.add(ambient);

    const group = new THREE.Group();
    scene.add(group);

    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.ShadowMaterial({ opacity: 0.3 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -2.38, 0);
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

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
        const scale = 18 / maxDim;

        const mat = new THREE.MeshStandardMaterial({
          color: 0xd9dde6,
          metalness: 0.10,
          roughness: 0.42,
        });

        statue = new THREE.Mesh(geometry, mat);
        statue.scale.setScalar(scale);
        statue.castShadow = true;
        statue.receiveShadow = false;
        // STL is Z-up; rotate to Y-up so it stands upright.
        statue.position.y = -2.2;
        group.add(statue);

        onResize();

        const tick = () => {
          if (disposed) return;
          if (statue) {
            // Yaw-only rotation: rotate around vertical axis based on scroll input.
            statue.rotation.x = -Math.PI / 2;
            statue.rotation.z += (targetYaw - statue.rotation.z) * 0.1;
            
            statue.rotation.y = 0;
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
      <div className="absolute inset-x-16 -bottom-0.5 h-8 bg-black/12 blur-2xl rounded-full" />
      <div className="absolute inset-x-20 bottom-1 h-5 bg-black/18 blur-xl rounded-full" />
      <div className="absolute inset-x-28 bottom-2 h-3 bg-black/22 blur-md rounded-full" />
    </div>
  );
}
