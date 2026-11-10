export interface EvolutionController {
  play(commit: () => void): Promise<boolean>
  cancel(): void
  dispose(): void
  ready: Promise<boolean>
}
export function createOrchisEvolution(display: HTMLElement, button: HTMLButtonElement): EvolutionController
export function createOrchisEvolutionAudio(media: HTMLAudioElement): {
  play(): Promise<boolean>
  stop(): void
  dispose(): void
}
