/** Lightweight UI sound bridge so design components stay decoupled from Web Audio setup. */
export interface UiSoundSink {
  hover: () => void;
  click: () => void;
  confirm: () => void;
  back: () => void;
}

let sink: UiSoundSink = {
  hover: () => undefined,
  click: () => undefined,
  confirm: () => undefined,
  back: () => undefined,
};

export function registerUiSoundSink(next: UiSoundSink): void {
  sink = next;
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
