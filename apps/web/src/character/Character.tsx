import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { match, useGame } from "../runtime";
import { ProceduralCharacter } from "./ProceduralCharacter";
import { createOfficialRig } from "./official";
import { animateCharacter, createAnimationState } from "./animation";
type Props = { index: number; display?: boolean };
class AssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
/** Official assets are optional at load time; practice always has a playable procedural fallback. */
export function Character(props: Props) {
  const fallback = <ProceduralCharacter {...props} />;
  return (
    <AssetBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <OfficialCharacter {...props} />
      </Suspense>
    </AssetBoundary>
  );
}
function OfficialCharacter({ index, display = false }: Props) {
  const character = useGLTF("/assets/aqua-blaster-kid.glb"),
    blaster = useGLTF("/assets/hydrocore-blaster.glb");
  const rig = useMemo(
    () =>
      createOfficialRig(
        character.scene,
        blaster.scene,
        character.animations,
        index,
      ),
    [character, blaster, index],
  );
  const pose = useMemo(createAnimationState, [rig]),
    time = useRef(0);
  const scratch = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      c: new THREE.Vector3(),
      goal: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      bend: new THREE.Vector3(),
      v: new THREE.Vector3(),
      u: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      world: new THREE.Quaternion(),
      parent: new THREE.Quaternion(),
      rotation: new THREE.Quaternion(),
      euler: new THREE.Euler(),
    }),
    [],
  );
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame((_, delta) => {
    const p = match.players[index],
      state = useGame.getState(),
      dt = state.paused && !display ? 0 : Math.min(delta, 0.1);
    time.current += dt;
    const a = animateCharacter(pose, p, {
      dt,
      time: time.current,
      pitch: display ? 0 : p.pitch,
      paused: state.paused,
      display,
      victory: !display && match.ended && match.winner === index,
    });
    const move =
        THREE.MathUtils.clamp(a.speed / 5, 0, 1) *
        (1 - a.air) *
        (1 - a.celebrate),
      walking = Math.max(0, 1 - Math.abs(a.speed - 2.8) / 2.8) * move;
    rig.idle.setEffectiveWeight(1 - move);
    rig.walk.setEffectiveWeight(walking);
    rig.run.setEffectiveWeight(move - walking);
    rig.run.timeScale = Math.max(0.7, a.speed / 6);
    rig.mixer.update(dt);
    rig.root.position.set(
      display ? 0 : p.pos.x,
      display ? 0 : p.pos.y,
      display ? 0 : p.pos.z,
    );
    rig.root.rotation.y = display
      ? 3.7 + Math.sin(time.current * 0.4) * 0.35
      : p.yaw;
    rig.root.visible = display || a.death < 1;
    rig.shield.visible = !display && p.dead <= 0 && p.protection > 0;
    rig.visual.rotation.z = a.death * 1.35;
    rig.visual.scale.setScalar(1 - a.death * 0.55);
    rig.visual.position.y =
      -a.death * 0.35 +
      a.celebrate * Math.max(0, Math.sin(time.current * 7)) * 0.1;
    rig.spine.quaternion.multiply(
      scratch.rotation.setFromEuler(
        scratch.euler.set(a.recoil * 0.07 + a.hurt * 0.1, 0, -a.strafe * 0.02),
      ),
    );
    for (let i = 0; i < 2; i++) {
      rig.legs[i].upper.quaternion.multiply(
        scratch.rotation.setFromAxisAngle(
          scratch.v.set(1, 0, 0),
          a.air * (-0.3 + (i ? 1 : -1) * 0.13),
        ),
      );
      rig.legs[i].lower.quaternion.multiply(
        scratch.rotation.setFromAxisAngle(
          scratch.v.set(1, 0, 0),
          a.air * (0.5 + a.doubleJump * 0.65),
        ),
      );
    }
    rig.head.quaternion.multiply(
      scratch.rotation.setFromEuler(
        scratch.euler.set(
          a.hurt * 0.12,
          0,
          Math.sin(time.current * 30) * a.hurt * 0.08,
        ),
      ),
    );
    rig.weapon.rotation.set(
      a.pitch - a.reload * 0.3 + a.celebrate * 0.65,
      0,
      a.reload * 0.2,
    );
    rig.weapon.scale.z = 1 - a.recoil * 0.1;
    rig.root.updateMatrixWorld(true);
    const rotateBone = (
      bone: THREE.Bone,
      child: THREE.Bone,
      target: THREE.Vector3,
    ) => {
      bone.getWorldPosition(scratch.v);
      child.getWorldPosition(scratch.u);
      scratch.u.sub(scratch.v).normalize();
      scratch.v.negate().add(target).normalize();
      scratch.q.setFromUnitVectors(scratch.u, scratch.v);
      bone.getWorldQuaternion(scratch.world);
      bone.parent!.getWorldQuaternion(scratch.parent);
      bone.quaternion.copy(
        scratch.parent.invert().multiply(scratch.q).multiply(scratch.world),
      );
      bone.updateWorldMatrix(false, true);
    };
    for (const arm of rig.arms) {
      const { goal, elbow, direction, bend } = scratch;
      goal.set(
        arm.side === 1 ? 0.1 : -0.12,
        arm.side === 1 ? -0.17 : -0.04 + a.reload * 0.28,
        arm.side === 1 ? 0.65 : 0.5 + a.reload * 0.1,
      );
      rig.weapon.localToWorld(goal);
      if (arm.side === -1 && a.celebrate > 0) {
        scratch.v.set(-0.6, 1.95 + Math.sin(time.current * 8) * 0.07, 0);
        rig.root.localToWorld(scratch.v);
        goal.lerp(scratch.v, a.celebrate);
      }
      arm.upper.getWorldPosition(scratch.a);
      arm.lower.getWorldPosition(scratch.b);
      arm.hand.getWorldPosition(scratch.c);
      const upperLength = scratch.a.distanceTo(scratch.b),
        lowerLength = scratch.b.distanceTo(scratch.c);
      direction.copy(goal).sub(scratch.a);
      const distance = THREE.MathUtils.clamp(
        direction.length(),
        Math.abs(upperLength - lowerLength) + 0.001,
        upperLength + lowerLength - 0.001,
      );
      direction.normalize();
      bend.set(arm.side * 0.7, -0.5, 0.7).applyQuaternion(rig.root.quaternion);
      bend.addScaledVector(direction, -bend.dot(direction)).normalize();
      const along =
        (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
      elbow
        .copy(scratch.a)
        .addScaledVector(direction, along)
        .addScaledVector(
          bend,
          Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)),
        );
      rotateBone(arm.upper, arm.lower, elbow);
      rotateBone(arm.lower, arm.hand, goal);
      rig.weapon.getWorldQuaternion(scratch.world);
      scratch.rotation.setFromAxisAngle(scratch.v.set(1, 0, 0), -Math.PI / 2);
      scratch.world.multiply(scratch.rotation);
      arm.hand.parent!.getWorldQuaternion(scratch.parent);
      arm.hand.quaternion.copy(scratch.parent.invert().multiply(scratch.world));
      arm.hand.updateWorldMatrix(false, true);
    }
    rig.root.userData.animation = a;
  });
  return <primitive object={rig.root} dispose={null} />;
}
