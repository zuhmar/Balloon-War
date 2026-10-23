import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WEAPON_SOCKET } from "@wbw/shared";
import { match, useGame } from "../runtime";
import { animateCharacter, createAnimationState } from "./animation";
import { createCharacterRig } from "./model";
/** Public asset adapter. Gameplay knows only a fighter and a muzzle socket, never mesh names. */
export function Character({
  index,
  display = false,
}: {
  index: number;
  display?: boolean;
}) {
  const rig = useMemo(() => createCharacterRig(index), [index]);
  const pose = useMemo(createAnimationState, [rig]);
  const animationTime = useRef(0);
  const scratch = useMemo(
    () => ({
      shoulder: new THREE.Vector3(),
      hand: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      bend: new THREE.Vector3(),
      axis: new THREE.Vector3(0, 1, 0),
      segment: new THREE.Vector3(),
    }),
    [],
  );
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame((_, delta) => {
    const p = match.players[index],
      state = useGame.getState();
    if (!state.paused || display) animationTime.current += Math.min(delta, 0.1);
    const t = animationTime.current;
    const a = animateCharacter(pose, p, {
      dt: delta,
      time: t,
      pitch: display ? 0 : p.pitch,
      paused: state.paused,
      display,
      victory: !display && match.ended && match.winner === index,
    });
    rig.root.position.set(
      display ? 0 : p.pos.x,
      display ? 0 : p.pos.y,
      display ? 0 : p.pos.z,
    );
    rig.root.rotation.y = display ? 3.7 + Math.sin(t * 0.4) * 0.35 : p.yaw;
    rig.root.visible = display || a.death < 1;
    rig.shield.visible = !display && p.dead <= 0 && p.protection > 0;
    const stride =
      Math.sin(a.phase) * Math.min(0.72, a.speed * 0.1) * (1 - a.air);
    rig.visual.position.y = -Math.sin((a.death * Math.PI) / 2) * 0.35;
    rig.visual.rotation.z = a.death * 1.35;
    rig.visual.scale.setScalar(1 - a.death * 0.55);
    const hop = a.celebrate * Math.max(0, Math.sin(t * 7)) * 0.14;
    rig.torso.position.y =
      0.97 + a.breath + Math.abs(stride) * 0.025 - a.landing * 0.055 + hop;
    rig.torso.rotation.set(
      -a.forward * 0.018 + a.air * 0.09 + a.recoil * 0.05,
      -a.strafe * 0.025,
      -a.strafe * 0.025 + a.hurt * Math.sin(t * 35) * 0.08,
    );
    rig.head.rotation.set(
      a.hurt * 0.13 - a.air * 0.04,
      Math.sin(t * 0.7) * 0.035,
      -a.strafe * 0.015,
    );
    rig.eyes.scale.y = a.hurt > 0.4 ? 0.65 : a.blink;
    rig.brows.rotation.z = a.hurt * Math.sin(t * 10) * 0.12;
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1,
        leg = rig.legs[i];
      leg.hip.rotation.x =
        stride * side + a.air * (-0.25 + side * 0.18) - a.landing * 0.2;
      leg.hip.rotation.z = -a.strafe * 0.035 + side * a.doubleJump * 0.22;
      leg.knee.rotation.x =
        Math.max(0, -stride * side) * 0.65 +
        a.air * (0.35 + a.doubleJump * 0.7);
      leg.hip.position.y = 0.66 + hop;
    }
    // Keep the muzzle stationary at the simulation socket. Recoil compresses the receiver behind it.
    rig.weapon.position.set(0, WEAPON_SOCKET.height, -WEAPON_SOCKET.forward);
    rig.weapon.rotation.set(
      a.pitch - a.reload * 0.32 + a.celebrate * 0.7,
      0,
      a.reload * 0.2,
    );
    rig.weapon.scale.z = 1 - a.recoil * 0.13;
    rig.weapon.updateMatrix();
    rig.torso.updateMatrix();
    for (const arm of rig.arms) {
      const { shoulder, hand, elbow, direction, bend, axis, segment } = scratch;
      shoulder.set(arm.side * 0.4, 0.14, 0).applyMatrix4(rig.torso.matrix);
      if (arm.side === 1) hand.set(0.11, -0.21, 0.55);
      else
        hand.set(
          -0.13 + a.reload * 0.13,
          -0.025 + a.reload * 0.28,
          0.3 + a.reload * 0.15,
        );
      hand.applyMatrix4(rig.weapon.matrix);
      if (arm.side === -1 && a.celebrate > 0.01)
        hand.lerp(
          segment.set(-0.65, 1.95 + Math.sin(t * 8) * 0.08, 0),
          a.celebrate,
        );
      direction.copy(hand).sub(shoulder);
      const distance = direction.length();
      direction.normalize();
      bend.set(arm.side * 0.7, -0.45, 0.8);
      bend.addScaledVector(direction, -bend.dot(direction)).normalize();
      elbow
        .copy(shoulder)
        .addScaledVector(direction, distance * 0.5)
        .addScaledVector(
          bend,
          Math.sqrt(Math.max(0.015, 0.44 ** 2 - (distance * 0.5) ** 2)),
        );
      arm.upper.position.copy(shoulder);
      segment.copy(elbow).sub(shoulder);
      arm.upper.scale.y = segment.length();
      arm.upper.quaternion.setFromUnitVectors(axis, segment.normalize());
      arm.lower.position.copy(elbow);
      segment.copy(hand).sub(elbow);
      arm.lower.scale.y = segment.length();
      arm.lower.quaternion.setFromUnitVectors(axis, segment.normalize());
      arm.hand.position.copy(hand);
      arm.hand.rotation.copy(rig.weapon.rotation);
    }
    // Optional development inspection socket; no gameplay state is written by this rig.
    rig.root.userData.animation = a;
  });
  return <primitive object={rig.root} dispose={null} />;
}
