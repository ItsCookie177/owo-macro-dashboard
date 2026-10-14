import type { AutomationAdapter } from './types.js';

export class MockAdapter implements AutomationAdapter {
  readonly name = 'mock' as const;
  sent: string[] = [];
  available = true;
  foreground = true;
  failAllSends = false;
  cleared = 0;
  screenText = '';
  wakeKept = 0;
  wakeRestored = 0;

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

  async dumpUi(): Promise<string> {
    return this.screenText;
  }

  async keepScreenAwake(): Promise<void> {
    this.wakeKept += 1;
  }

  async restoreScreenTimeout(): Promise<void> {
    this.wakeRestored += 1;
  }

  async dispose(): Promise<void> {}
}
