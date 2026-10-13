export interface AutomationAdapter {
  readonly name: 'mock' | 'shizuku' | 'adb';
  isAvailable(): Promise<boolean>;
  /** Discord focus input (strict) — dipakai sebelum tiap kirim. */
  checkForeground(): Promise<boolean>;
  /** Discord terlihat di layar (boleh split-screen, fokus di pane lain). */
  checkVisible?(): Promise<boolean>;
  sendCommand(text: string): Promise<void>;
  clearComposer(): Promise<void>;
  /** Dump UI hierarchy (uiautomator). Opsional — hanya untuk probe. */
  dumpUi?(): Promise<string>;
  dispose(): Promise<void>;
}
