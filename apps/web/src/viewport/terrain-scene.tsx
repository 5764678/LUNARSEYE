"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, DirectionalLight, Object3D } from "three";

import type { SiteOut } from "@/shared/api/client";
import type { Vec3 } from "@/shared/lib/geo/selenographic";
import { latLonToMap, mapToMoonMe, moonMeToLocalKm, sceneHeightAt } from "@/shared/lib/terrain/polar";

export interface SceneGrid {
  gridSize: number;
  halfExtentM: number;
  heights: ReadonlyArray<number | null>;
}

/** Mesh in local kilometres. Triangles touching a missing vertex are not drawn. */
function buildGeometry(grid: SceneGrid, exaggeration: number): BufferGeometry {
  const n = grid.gridSize;
  const spacing = (2 * grid.halfExtentM) / (n - 1);
  const positions = new Float32Array(n * n * 3);
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const h = grid.heights[row * n + col];
      const p = moonMeToLocalKm(
        mapToMoonMe(-grid.halfExtentM + col * spacing, grid.halfExtentM - row * spacing, (h ?? 0) * exaggeration),
      );
      positions.set(p, (row * n + col) * 3);
    }
  }
  const indices: number[] = [];
  for (let row = 0; row < n - 1; row += 1) {
    for (let col = 0; col < n - 1; col += 1) {
      const a = row * n + col;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      if ([a, b, c, d].some((i) => grid.heights[i] == null)) continue;
      // Counter-clockwise seen from above (+Y).
      indices.push(a, c, b, b, c, d); // counter-clockwise seen from above (+Y)
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Sun({ direction, reach }: { direction: Vec3; reach: number }) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useEffect(() => {
    if (!light.current) return;
    light.current.position.set(direction[0] * reach * 2, direction[1] * reach * 2, direction[2] * reach * 2);
    light.current.target = target;
    light.current.shadow.camera.updateProjectionMatrix();
  }, [direction, reach, target]);
  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        intensity={3.2}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.6}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={reach * 0.2}
        shadow-camera-far={reach * 4}
      />
    </>
  );
}

function Markers({
  sites,
  selectedId,
  onSelect,
  grid,
  exaggeration,
}: {
  sites: SiteOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  grid: SceneGrid;
  exaggeration: number;
}) {
  const placed = useMemo(
    () =>
      sites.flatMap((site) => {
        const [mx, my] = latLonToMap(site.latitude_deg, site.longitude_deg);
        const h = sceneHeightAt(grid.heights, grid.gridSize, grid.halfExtentM, mx, my);
        if (h === null) return [];
        const [x, y, z] = moonMeToLocalKm(mapToMoonMe(mx, my, h * exaggeration));
        return [{ site, position: [x, y, z] as [number, number, number] }];
      }),
    [sites, grid, exaggeration],
  );
  return (
    <>
      {placed.map(({ site, position }) => {
        const selected = site.id === selectedId;
        return (
          <group key={site.id} position={position}>
            {/* A pole from the surface, so the marker reads against relief. */}
            <mesh position={[0, selected ? 3.5 : 2, 0]}>
              <cylinderGeometry args={[0.12, 0.12, selected ? 7 : 4, 6]} />
              <meshBasicMaterial color={selected ? "#ffd166" : "#7cb5ff"} toneMapped={false} />
            </mesh>
            <mesh
              position={[0, selected ? 7.6 : 4.4, 0]}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(site.id);
              }}
            >
              <sphereGeometry args={[selected ? 1.3 : 0.8, 14, 10]} />
              <meshBasicMaterial color={selected ? "#ffd166" : "#7cb5ff"} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function Rig({ target }: { target: [number, number, number] | null }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null;
  useEffect(() => {
    if (!target || !controls) return;
    controls.target.set(target[0], target[1], target[2]);
    camera.position.set(target[0] + 55, target[1] + 60, target[2] + 85);
    controls.update();
  }, [target, camera, controls]);
  return null;
}

export default function TerrainScene({
  grid,
  sites,
  selectedId,
  onSelect,
  sunLocal,
  exaggeration,
}: {
  grid: SceneGrid;
  sites: SiteOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Unit vector toward the Sun in the local frame, or null while it is computed. */
  sunLocal: Vec3 | null;
  exaggeration: number;
}) {
  const geometry = useMemo(() => buildGeometry(grid, exaggeration), [grid, exaggeration]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const reach = (grid.halfExtentM / 1000) * 1.45;
  const selected = sites.find((s) => s.id === selectedId) ?? null;
  const target = useMemo((): [number, number, number] | null => {
    if (!selected) return null;
    const [mx, my] = latLonToMap(selected.latitude_deg, selected.longitude_deg);
    const h = sceneHeightAt(grid.heights, grid.gridSize, grid.halfExtentM, mx, my);
    if (h === null) return null;
    const [x, y, z] = moonMeToLocalKm(mapToMoonMe(mx, my, h * exaggeration));
    return [x, y, z];
  }, [selected, grid, exaggeration]);

  return (
    <Canvas shadows camera={{ fov: 35, near: 1, far: 2000, position: [60, 110, 170] }} dpr={[1, 2]}>
      <color attach="background" args={["#020305"]} />
      {/* Fill light so shadowed ground is dark, not black: a display choice. */}
      <ambientLight intensity={0.09} />
      {sunLocal ? <Sun direction={sunLocal} reach={reach} /> : <ambientLight intensity={0.6} />}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#9a958d" roughness={1} metalness={0} />
      </mesh>
      <Markers sites={sites} selectedId={selectedId} onSelect={onSelect} grid={grid} exaggeration={exaggeration} />
      <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.49} minDistance={8} maxDistance={600} />
      <Rig target={target} />
    </Canvas>
  );
}
