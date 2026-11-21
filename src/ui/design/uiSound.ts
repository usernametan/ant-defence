/** Lightweight UI sound bridge so design components stay decoupled from Web Audio setup. */
export interface UiSoundSink {
  hover: () => void;
  click: () => void;
  confirm: () => void;
  back: () => void;
  setLandingMusicActive?: (active: boolean) => void;
}

let landingMusicActive = false;

let sink: UiSoundSink = {
  hover: () => undefined,
  click: () => undefined,
  confirm: () => undefined,
  back: () => undefined,
};

export function registerUiSoundSink(next: UiSoundSink): void {
  sink = next;
  sink.setLandingMusicActive?.(landingMusicActive);
}

export function playUiHover(): void {
  sink.hover();
}

export function playUiClick(): void {
  sink.click();
}

export function playUiConfirm(): void {
  sink.confirm();
}

export function playUiBack(): void {
  sink.back();
}

export function setLandingMusicActive(active: boolean): void {
  landingMusicActive = active;
  sink.setLandingMusicActive?.(active);
}
