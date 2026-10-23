import { create } from "zustand";
import { Match } from "@wbw/game";
export const useGame = create<{
  screen: "menu" | "game" | "result";
  paused: boolean;
  difficulty: number;
  quality: boolean;
  sensitivity: number;
  volume: number;
  set: (
    v: Partial<{
      screen: "menu" | "game" | "result";
      paused: boolean;
      difficulty: number;
      quality: boolean;
      sensitivity: number;
      volume: number;
    }>,
  ) => void;
}>((set) => ({
  screen: "menu",
  paused: false,
  difficulty: 1,
  quality: true,
  sensitivity: 1,
  volume: 0.35,
  set,
}));
export let match = new Match();
export const controls = {
  keys: new Set<string>(),
  yaw: 0,
  pitch: -0.06,
  jump: false,
  fire: false,
  reload: false,
  mx: 0,
  mz: 0,
  sprint: false,
};
export const touch = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;
let audio: AudioContext | undefined;
export function sound(freq: number) {
  const volume = useGame.getState().volume;
  if (!volume) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(70, audio.currentTime + 0.12);
    g.gain.setValueAtTime(volume * 0.2, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.16);
  } catch {
    /* Audio may be unavailable until a user gesture. */
  }
}
export function start() {
  match = new Match();
  controls.yaw = 0;
  controls.pitch = -0.06;
  controls.keys.clear();
  controls.fire = false;
  controls.jump = false;
  controls.reload = false;
  controls.sprint = false;
  controls.mx = controls.mz = 0;
  useGame.getState().set({ screen: "game", paused: false });
  sound(500);
  if (!touch()) void document.querySelector("canvas")?.requestPointerLock();
}
