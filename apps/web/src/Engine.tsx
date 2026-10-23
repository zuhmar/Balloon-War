import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RULES, COVER } from "@wbw/shared";
import { emptyInput, botInput } from "@wbw/game";
import { controls, useGame, sound, match, touch } from "./runtime";
export function Engine() {
  const { camera, gl } = useThree();
  const accumulator = useRef(0),
    look = useRef(new THREE.Vector3()),
    desired = useRef(new THREE.Vector3()),
    ray = useRef(new THREE.Raycaster());
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code))
        e.preventDefault();
      controls.keys.add(e.code);
      if (e.code === "Space" && !e.repeat) controls.jump = true;
      if (e.code === "KeyR") controls.reload = true;
      if (e.code === "Escape" && useGame.getState().screen === "game") {
        useGame.getState().set({ paused: true });
        document.exitPointerLock();
      }
    };
    const keyup = (e: KeyboardEvent) => controls.keys.delete(e.code);
    const mouse = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        controls.yaw -= e.movementX * 0.002 * useGame.getState().sensitivity;
        controls.pitch = THREE.MathUtils.clamp(
          controls.pitch - e.movementY * 0.002 * useGame.getState().sensitivity,
          -0.65,
          0.65,
        );
      }
    };
    const down = () => {
      if (useGame.getState().screen === "game" && !useGame.getState().paused) {
        controls.fire = true;
        if (!touch()) void gl.domElement.requestPointerLock();
      }
    };
    const up = () => {
      controls.fire = false;
    };
    const blur = () => {
      controls.keys.clear();
      controls.fire = false;
      if (useGame.getState().screen === "game")
        useGame.getState().set({ paused: true });
    };
    const lock = () => {
      if (
        !document.pointerLockElement &&
        !touch() &&
        useGame.getState().screen === "game"
      )
        useGame.getState().set({ paused: true });
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("mousemove", mouse);
    gl.domElement.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("pointerlockchange", lock);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("mousemove", mouse);
      gl.domElement.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("pointerlockchange", lock);
    };
  }, [gl]);
  useFrame((_, delta) => {
    const state = useGame.getState();
    if (state.screen !== "game") {
      camera.position.lerp(
        new THREE.Vector3(22, 18, 25),
        1 - Math.exp(-6 * delta),
      );
      camera.lookAt(0, 0, 0);
      return;
    }
    const p = match.players[0];
    if (!state.paused) {
      accumulator.current += Math.min(delta, 0.1);
      while (accumulator.current >= RULES.tick) {
        const input = {
          ...emptyInput(),
          x:
            Number(controls.keys.has("KeyD")) -
            Number(controls.keys.has("KeyA")) +
            controls.mx,
          z:
            Number(controls.keys.has("KeyW")) -
            Number(controls.keys.has("KeyS")) +
            controls.mz,
          jump: controls.jump,
          fire: controls.fire,
          sprint: controls.keys.has("ShiftLeft") || controls.sprint,
          reload: controls.reload,
          yaw: controls.yaw,
          pitch: controls.pitch,
        };
        const shots = p.shots,
          hp = p.hp,
          score = p.score;
        match.step([input, botInput(match, state.difficulty)], RULES.tick);
        if (p.shots > shots) sound(600);
        if (p.hp < hp) sound(130);
        if (p.score > score) sound(950);
        controls.jump = false;
        controls.reload = false;
        accumulator.current -= RULES.tick;
        if (match.ended) {
          state.set({ screen: "result" });
          document.exitPointerLock();
          break;
        }
      }
    }
    const target = new THREE.Vector3(p.pos.x, p.pos.y + 1.4, p.pos.z);
    const forward = new THREE.Vector3(
      -Math.sin(controls.yaw) * Math.cos(controls.pitch),
      Math.sin(controls.pitch),
      -Math.cos(controls.yaw) * Math.cos(controls.pitch),
    );
    desired.current.copy(target).addScaledVector(forward, -5.5);
    desired.current.y += 1;
    desired.current.x += Math.cos(controls.yaw) * 0.65;
    desired.current.z -= Math.sin(controls.yaw) * 0.65;
    // Clamp the camera inside arena boundaries and avoid cover behind the shoulder.
    const direction = desired.current.clone().sub(target),
      distance = direction.length();
    ray.current.set(target, direction.normalize());
    let obstruction = distance;
    for (const b of COVER) {
      const box = new THREE.Box3(
        new THREE.Vector3(b.x - b.w / 2 - 0.2, -0.2, b.z - b.d / 2 - 0.2),
        new THREE.Vector3(b.x + b.w / 2 + 0.2, b.h + 0.2, b.z + b.d / 2 + 0.2),
      );
      const hit = ray.current.ray.intersectBox(box, new THREE.Vector3());
      if (hit) obstruction = Math.min(obstruction, target.distanceTo(hit));
    }
    if (obstruction < distance)
      desired.current
        .copy(target)
        .addScaledVector(direction, Math.max(0.5, obstruction - 0.1));
    desired.current.x = THREE.MathUtils.clamp(desired.current.x, -15.6, 15.6);
    desired.current.z = THREE.MathUtils.clamp(desired.current.z, -15.6, 15.6);
    camera.position.lerp(desired.current, 1 - Math.exp(-15 * delta));
    look.current.copy(target).addScaledVector(forward, 50);
    camera.lookAt(look.current);
  }, -1); // Simulate before character rigs/effects sample this frame's state.
  return null;
}
