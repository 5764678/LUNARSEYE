"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DoubleSide,
  LinearMipmapLinearFilter,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from "three";

import type { SiteOut } from "@/shared/api/client";
import { selenographicToScene, type Vec3 } from "@/shared/lib/geo/selenographic";
import { cssColor } from "@/shared/ui/tokens";

import { MODE_PROCEDURAL, MODE_TEXTURE, moonFragmentShader, moonVertexShader } from "./moon-shader";

/** The SPICE-lit globe has no earthshine: the night side is lifted slightly so it reads
 *  as dark rather than black. Display choice, disclosed in the HUD. */
const NIGHT_FLOOR = 0.045;

function Surface({ texture, sun }: { texture: Texture | null; sun: Vec3 | null }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: moonVertexShader,
        fragmentShader: moonFragmentShader,
        uniforms: {
          uLightDir: { value: new Vector3(1, 0, 0) },
          uMode: { value: texture ? MODE_TEXTURE : MODE_PROCEDURAL },
          uColorMap: { value: texture },
          uExposure: { value: texture ? 1.1 : 1.0 },
          uNightFloor: { value: NIGHT_FLOOR },
        },
      }),
    [texture],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    if (sun) (material.uniforms.uLightDir!.value as Vector3).set(sun[0], sun[1], sun[2]).normalize();
  });
  return (
    <mesh material={material}>
      <sphereGeometry args={[1, 192, 128]} />
    </mesh>
  );
}

function Markers({
  sites,
  selectedId,
  onSelect,
}: {
  sites: SiteOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const colors = useMemo(
    () => ({
      marker: cssColor("--site-marker"),
      selected: cssColor("--site-marker-selected"),
      halo: cssColor("--site-halo"),
    }),
    [],
  );
  // Each marker lies in the local horizontal plane: its ring normal is the radial direction.
  const placed = useMemo(
    () =>
      sites.map((site) => {
        const position = selenographicToScene(site.latitude_deg, site.longitude_deg, 1.002) as unknown as [
          number,
          number,
          number,
        ];
        const normal = new Vector3(...position).normalize();
        return {
          site,
          position,
          quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal),
          below: normal.clone().multiplyScalar(-0.0003).toArray() as [number, number, number],
        };
      }),
    [sites],
  );
  return (
    <>
      {placed.map(({ site, position, quaternion, below }) => {
        const selected = site.id === selectedId;
        const radius = selected ? 0.0065 : 0.0045;
        return (
          <group key={site.id} position={position}>
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                onSelect(site.id);
              }}
            >
              <sphereGeometry args={[radius, 16, 12]} />
              <meshBasicMaterial color={selected ? colors.selected : colors.marker} toneMapped={false} />
            </mesh>
            {/* A dark halo, so the dot reads against both the lit surface and the night side. */}
            <mesh quaternion={quaternion} position={below}>
              <ringGeometry args={[radius * 1.1, radius * 2.3, 32]} />
              <meshBasicMaterial color={colors.halo} side={DoubleSide} toneMapped={false} />
            </mesh>
            {selected ? (
              <>
                <mesh quaternion={quaternion}>
                  <ringGeometry args={[0.014, 0.017, 48]} />
                  <meshBasicMaterial color={colors.selected} side={DoubleSide} toneMapped={false} />
                </mesh>
                <mesh quaternion={quaternion} position={below}>
                  <ringGeometry args={[0.0128, 0.0192, 48]} />
                  <meshBasicMaterial color={colors.halo} side={DoubleSide} toneMapped={false} />
                </mesh>
              </>
            ) : null}
          </group>
        );
      })}
    </>
  );
}

/** Puts the camera over the south polar region on the selected site's meridian, keeping
 *  the user's zoom. */
function CameraRig({ site }: { site: SiteOut | null }) {
  const camera = useThree((s) => s.camera);
  const longitude = site?.longitude_deg ?? 0;
  useEffect(() => {
    const distance = camera.position.length() || 2.2;
    const [x, y, z] = selenographicToScene(-80, longitude, distance);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }, [camera, longitude]);
  return null;
}

export default function MoonGlobe({
  sites,
  selectedId,
  onSelect,
  sunScene,
  textureUrl,
}: {
  sites: SiteOut[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Unit vector toward the Sun in scene axes, or null while it is being computed. */
  sunScene: Vec3 | null;
  textureUrl: string | null;
}) {
  const [texture, setTexture] = useState<Texture | null>(null);
  const loaded = useRef<Texture | null>(null);
  useEffect(() => {
    if (!textureUrl) return;
    let cancelled = false;
    new TextureLoader().load(textureUrl, (map) => {
      if (cancelled) return map.dispose();
      map.colorSpace = SRGBColorSpace;
      map.minFilter = LinearMipmapLinearFilter;
      map.anisotropy = 8;
      loaded.current = map;
      setTexture(map);
    });
    return () => {
      cancelled = true;
      loaded.current?.dispose();
    };
  }, [textureUrl]);

  const selected = sites.find((s) => s.id === selectedId) ?? null;
  const background = useMemo(() => cssColor("--plate"), []);
  return (
    <Canvas camera={{ fov: 32, near: 0.05, far: 50, position: [0.38, -2.17, 0] }} dpr={[1, 2]}>
      <color attach="background" args={[background]} />
      <CameraRig site={selected} />
      <Surface texture={texture} sun={sunScene} />
      <Markers sites={sites} selectedId={selectedId} onSelect={onSelect} />
      <OrbitControls enablePan={false} minDistance={1.12} maxDistance={6} rotateSpeed={0.5} />
    </Canvas>
  );
}
