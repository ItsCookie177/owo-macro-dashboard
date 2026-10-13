import type { AutomationAdapter } from './types.js';

export class MockAdapter implements AutomationAdapter {
  readonly name = 'mock' as const;
  sent: string[] = [];
  available = true;
  foreground = true;
  failAllSends = false;
  cleared = 0;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async checkForeground(): Promise<boolean> {
    return this.foreground;
  }

  async checkVisible(): Promise<boolean> {
    return this.foreground;
  }

  async sendCommand(text: string): Promise<void> {
    if (this.failAllSends) {
      throw new Error('mock: send gagal');
    }
    this.sent.push(text);
  }

  async clearComposer(): Promise<void> {
    this.cleared += 1;
  }

  async dispose(): Promise<void> {}
}
