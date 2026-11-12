import { GAME_IDENTITY } from "./content";
import { EventBus } from "./core/EventBus";
import {
  FixedStepLoop,
  browserFrameScheduler,
  type FrameScheduler,
} from "./core/Loop";
import {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
  type GamePhase,
  type Vec2,
} from "./core/types";
import { Player } from "./entities/Player";
import {
  InputRouter,
  type InputAction,
  type PointerState,
} from "./input/InputRouter";
import { Camera } from "./render/Camera";
import { Renderer } from "./render/Renderer";
import { SnapshotStore } from "./ui/UiSnapshot";
import { createTestArena, type TestArena } from "./world/TestArena";

type GameEvents = {
  "game:phase-changed": {
    from: GamePhase;
    to: GamePhase;
  };
};

export interface GameOptions {
  config?: Partial<GameConfig>;
  scheduler?: FrameScheduler;
  snapshotStore?: SnapshotStore;
}

export class Game {
  readonly snapshots: SnapshotStore;

  private readonly config: GameConfig;
  private readonly scheduler: FrameScheduler;
  private readonly camera: Camera;
  private readonly renderer: Renderer;
  private readonly input: InputRouter;
  private readonly loop: FixedStepLoop;
  private readonly arena: TestArena;
  private readonly player: Player;
  private readonly events = new EventBus<GameEvents>();
  private phase: GamePhase = "menu";
  private frame = 0;
  private elapsed = 0;
  private visualTime = 0;
  private fps = 0;
  private interpolation = 0;
  private debug = false;
  private lastRenderAt = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: GameOptions = {}) {
    this.config = {
      ...DEFAULT_GAME_CONFIG,
      ...options.config,
    };
    this.scheduler = options.scheduler ?? browserFrameScheduler;
    this.camera = new Camera(this.config);
    this.renderer = new Renderer(canvas, this.config, this.camera);
    this.snapshots =
      options.snapshotStore ??
      new SnapshotStore(undefined, this.config.snapshotIntervalMs);
    this.arena = createTestArena(
      this.config.worldWidth,
      this.config.worldHeight,
      this.config.tileSize,
    );
    this.player = new Player(this.arena.spawn);
    this.camera.moveTo(this.player.x, this.player.y);
    this.input = new InputRouter(window, canvas, {
      onAction: this.handleAction,
      onBlur: this.handleBlur,
    });
    this.loop = new FixedStepLoop(this.scheduler, {
      fixedStep: this.config.fixedStep,
      maxCatchUpSteps: this.config.maxCatchUpSteps,
      maxFrameDelta: this.config.maxFrameDelta,
      onUpdate: this.update,
      onRender: this.render,
      onError: this.handleError,
    });

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.publish(true);
  }

  get currentPhase(): GamePhase {
    return this.phase;
  }

  get isDebug(): boolean {
    return this.debug;
  }

  start(): void {
    if (this.destroyed) {
      return;
    }

    this.input.attach();
    this.loop.start(this.scheduler.now());
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.loop.stop();
    this.input.detach();
    this.renderer.destroy();
    this.events.clear();
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  enterPreview(): void {
    if (this.phase === "playing") {
      return;
    }

    if (this.phase === "menu") {
      this.player.reset(this.arena.spawn);
      this.camera.moveTo(this.player.x, this.player.y);
    }

    this.setPhase("playing");
  }

  pause(): void {
    if (this.phase !== "playing") {
      return;
    }

    this.setPhase("paused");
  }

  resume(): void {
    if (this.phase !== "paused") {
      return;
    }

    this.setPhase("playing");
  }

  returnToMenu(): void {
    if (this.phase === "menu") {
      return;
    }

    this.player.reset(this.arena.spawn);
    this.camera.moveTo(this.player.x, this.player.y);
    this.setPhase("menu");
  }

  toggleDebug(): void {
    this.debug = !this.debug;
    this.publish(true);
  }

  private readonly handleAction = (action: InputAction): void => {
    switch (action) {
      case "start":
        if (this.phase === "menu") {
          this.enterPreview();
        } else if (this.phase === "paused") {
          this.resume();
        }
        break;
      case "pause":
        if (this.phase === "playing") {
          this.pause();
        } else if (this.phase === "paused") {
          this.resume();
        }
        break;
      case "toggleDebug":
        this.toggleDebug();
        break;
      case "dodge":
        if (this.phase === "menu") {
          this.enterPreview();
        } else if (this.phase === "paused") {
          this.resume();
        } else if (
          this.player.requestDodge(this.input.getMovementIntent())
        ) {
          this.publish(true);
        }
        break;
    }
  };

  private readonly update = (stepSeconds: number): void => {
    if (this.phase !== "playing") {
      return;
    }

    this.elapsed += stepSeconds;
    this.frame += 1;

    const pointer = this.input.getPointer();
    this.player.update(
      stepSeconds,
      this.input.getMovementIntent(),
      this.input.isSprinting(),
      this.arena,
      this.getAimWorld(pointer),
    );
  };

  private readonly render = (interpolation: number): void => {
    const now = this.scheduler.now();
    const deltaSeconds =
      this.lastRenderAt === 0 ? 0 : (now - this.lastRenderAt) / 1000;
    this.lastRenderAt = now;

    if (deltaSeconds > 0 && deltaSeconds < 1) {
      const instantFps = 1 / deltaSeconds;
      this.fps =
        this.fps === 0 ? instantFps : this.fps * 0.9 + instantFps * 0.1;
    }

    if (deltaSeconds > 0) {
      this.visualTime += Math.min(deltaSeconds, this.config.maxFrameDelta);
    }

    const pointer = this.input.getPointer();
    const playerPosition = this.player.getRenderPosition(interpolation);
    let aim = this.getAimWorld(pointer);

    if (this.phase === "playing") {
      const lookAhead = aim
        ? {
            x: aim.x - playerPosition.x,
            y: aim.y - playerPosition.y,
          }
        : undefined;

      this.camera.follow(
        playerPosition,
        Math.min(deltaSeconds, this.config.maxFrameDelta),
        {
          deadzone: 30,
          smoothing: 9,
          lookAhead,
          maxLookAhead: 90,
        },
      );
      aim = this.getAimWorld(pointer);
    }

    this.interpolation = interpolation;
    this.renderer.render({
      timeSeconds: this.visualTime,
      debug: this.debug,
      arena: this.arena,
      player: this.player.getRenderState(interpolation),
      aim,
    });
    this.publish();
  };

  private getAimWorld(pointer: PointerState): Vec2 | null {
    if (!pointer.inside) {
      return null;
    }

    return this.camera.screenToWorld({
      x: pointer.normalizedX * this.config.viewportWidth,
      y: pointer.normalizedY * this.config.viewportHeight,
    });
  }

  private setPhase(nextPhase: GamePhase): void {
    if (this.phase === nextPhase) {
      return;
    }

    const previousPhase = this.phase;
    this.phase = nextPhase;
    this.events.emit("game:phase-changed", {
      from: previousPhase,
      to: nextPhase,
    });
    this.publish(true);
  }

  private publish(force = false): void {
    this.snapshots.update(
      {
        phase: this.phase,
        title: GAME_IDENTITY.wordmark,
        kicker: GAME_IDENTITY.kicker,
        stage: GAME_IDENTITY.stage,
        version: GAME_IDENTITY.version,
        region: GAME_IDENTITY.firstRegion,
        world: {
          width: this.config.worldWidth,
          height: this.config.worldHeight,
        },
        camera: {
          x: this.camera.x,
          y: this.camera.y,
          viewportWidth: this.camera.width,
          viewportHeight: this.camera.height,
        },
        player: {
          x: this.player.x,
          y: this.player.y,
          facing: this.player.facingAngle,
          speed: this.player.speed,
          stamina: this.player.currentStamina,
          maxStamina: this.player.maxStamina,
          sprinting: this.player.isSprinting,
          dodging: this.player.isDodging,
          invulnerable: this.player.isInvulnerable,
          dodgeCooldown: this.player.dodgeCooldownRemaining,
          dodgeCooldownMax: this.player.dodgeCooldownMax,
        },
        frame: this.frame,
        elapsed: this.elapsed,
        fps: this.fps,
        interpolation: this.interpolation,
        debug: this.debug,
      },
      this.scheduler.now(),
      force,
    );
  }

  private readonly handleBlur = (): void => {
    if (this.phase === "playing") {
      this.pause();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.handleBlur();
    }
  };

  private readonly handleError = (error: unknown): void => {
    console.error("[MonsterFrontier] frame error", error);
  };
}
