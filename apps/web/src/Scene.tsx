import React, { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, ContactShadows } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { COVER } from "@wbw/shared";
import { match } from "./runtime";
function Box({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(...size) * 0.28}
      smoothness={3}
      position={position}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.27} metalness={0.08} />
    </RoundedBox>
  );
}
function Label({
  text,
  position,
  ground = false,
  width = 8,
}: {
  text: string;
  position: [number, number, number];
  ground?: boolean;
  width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.font = "900 90px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = ground ? "#ffffff" : "#174e70";
    context.fillText(text, 512, 64);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, ground]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={position}
      rotation={ground ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
    >
      <planeGeometry args={[width, width / 8]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
export function Arena() {
  return (
    <group>
      <color attach="background" args={["#bce9ed"]} />
      <fog attach="fog" args={["#bce9ed", 35, 85]} />
      <hemisphereLight args={["#e9fcff", "#6681a3", 2]} />
      <directionalLight
        position={[8, 20, 10]}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[16, 0.5, 16]} position={[0, -0.5, 0]} />
        <Box position={[0, -0.4, 0]} size={[32, 0.8, 32]} color="#8cdbdf" />
        {COVER.map((b, i) => (
          <React.Fragment key={i}>
            <CuboidCollider
              args={[b.w / 2, b.h / 2, b.d / 2]}
              position={[b.x, b.h / 2, b.z]}
            />
            <Box
              position={[b.x, b.h / 2, b.z]}
              size={[b.w, b.h, b.d]}
              color={b.color}
            />
            <Box
              position={[b.x, b.h + 0.04, b.z]}
              size={[b.w - 0.2, 0.1, b.d - 0.2]}
              color="#ffffff"
            />
          </React.Fragment>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            position={
              i < 2
                ? [0, 0.65, i === 0 ? -16 : 16]
                : [i === 2 ? -16 : 16, 0.65, 0]
            }
            size={i < 2 ? [33, 1.3, 0.6] : [0.6, 1.3, 33]}
            color={i % 2 ? "#7e84d7" : "#48bbc6"}
          />
        ))}
      </RigidBody>
      {[-12, 12].map((z) => (
        <group key={z}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, z]}>
            <circleGeometry args={[2.5, 48]} />
            <meshStandardMaterial color={z > 0 ? "#359bda" : "#ff9f75"} />
          </mesh>
          <Label
            ground
            position={[0, 0.03, z]}
            width={4}
            text={z > 0 ? "BLUE BASE" : "CORAL BASE"}
          />
        </group>
      ))}
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
        <mesh key={x} position={[x, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.025, 31]} />
          <meshBasicMaterial color="#c5f1ec" />
        </mesh>
      ))}
      {[-12, -8, -4, 0, 4, 8, 12].map((z) => (
        <mesh key={z} position={[0, 0.009, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[31, 0.025]} />
          <meshBasicMaterial color="#c5f1ec" />
        </mesh>
      ))}
      <Label position={[0, 4, -17]} width={12} text="SPLASH YARD" />
      {[-18, 18].flatMap((x) =>
        [-12, 0, 12].map((z) => (
          <group key={`${x},${z}`} position={[x, 0, z]}>
            <mesh position={[0, 2, 0]}>
              <cylinderGeometry args={[0.18, 0.3, 4]} />
              <meshStandardMaterial color="#f6f0dc" />
            </mesh>
            <mesh position={[0, 4, 0]}>
              <sphereGeometry args={[1.8, 16, 16]} />
              <meshStandardMaterial color="#52bb9b" />
            </mesh>
          </group>
        )),
      )}
      <ContactShadows
        frames={1}
        position={[0, 0.02, 0]}
        opacity={0.22}
        scale={40}
        blur={2}
        far={7}
      />
    </group>
  );
}
export { Character } from "./character/Character";
export function Effects() {
  const [, update] = useState(0);
  useFrame(() => update((x) => (x + 1) % 10000));
  return (
    <>
      {match.shots.map((s) => (
        <group key={s.id} position={[s.pos.x, s.pos.y, s.pos.z]}>
          <mesh scale={[0.17, 0.18, 0.28]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial
              color={s.owner ? "#ff8f80" : "#4fbbff"}
              roughness={0.15}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.24, 8, 8]} />
            <meshBasicMaterial color="#b9f5ff" transparent opacity={0.15} />
          </mesh>
        </group>
      ))}
      {match.splashes.map((s) => (
        <group key={s.id} position={[s.pos.x, s.pos.y, s.pos.z]}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4,
              d = (0.6 - s.life) * 3;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(a) * d,
                  Math.sin(i * 4) * d + 0.2,
                  Math.sin(a) * d,
                ]}
                scale={s.life}
              >
                <sphereGeometry args={[0.15, 6, 6]} />
                <meshBasicMaterial color={s.color} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}
