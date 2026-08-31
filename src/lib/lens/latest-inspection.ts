export class LatestInspection {
  private active: AbortController | null = null;

  start(): AbortController {
    this.active?.abort();
    const controller = new AbortController();
    this.active = controller;
    return controller;
  }

  cancel(): void {
    this.active?.abort();
    this.active = null;
  }

  isCurrent(controller: AbortController): boolean {
    return this.active === controller && !controller.signal.aborted;
  }

  commit(controller: AbortController, render: () => void): boolean {
    if (!this.isCurrent(controller)) return false;
    render();
    return true;
  }
}
