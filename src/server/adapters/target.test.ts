import { describe, expect, it } from 'vitest';
import {
  isDiscordForeground,
  isDiscordVisible,
  parseComposerId,
} from './target.js';

describe('isDiscordForeground', () => {
  it('true untuk mCurrentFocus Discord', () => {
    expect(
      isDiscordForeground(
        'mCurrentFocus=Window{abc123 u0 com.discord/com.discord.main.MainActivity}',
      ),
    ).toBe(true);
  });

  it('false untuk app lain', () => {
    expect(
      isDiscordForeground(
        'mCurrentFocus=Window{abc u0 com.android.settings/.Settings}',
      ),
    ).toBe(false);
  });

  it('fallback longgar: ada com.discord di output', () => {
    expect(
      isDiscordForeground('mFocusedApp=ActivityRecord{... com.discord/.main x}'),
    ).toBe(true);
  });
});

describe('isDiscordVisible', () => {
  const windowsDump = `
  Window #17 Window{de514a7 u0 com.discord/com.discord.main.MainDefault}:
    mBaseLayer=21000
    isOnScreen=true
    mSurfaceController=Surface(name=com.discord/com.discord.main.MainDefault)
  Window #18 Window{6022a7b u0 com.example.other/.Main}:
    isOnScreen=true
`;

  it('true saat jendela Discord isOnScreen (split-screen)', () => {
    expect(isDiscordVisible(windowsDump)).toBe(true);
  });

  it('false saat Discord ada tapi tidak di layar', () => {
    expect(
      isDiscordVisible(
        'Window #17 Window{x u0 com.discord/.main.Main}:\n    isOnScreen=false',
      ),
    ).toBe(false);
  });

  it('false saat Discord sama sekali tidak ada', () => {
    expect(isDiscordVisible('Window #1 Window{x u0 com.other/.Main}:')).toBe(
      false,
    );
  });
});

describe('parseComposerId', () => {
  const xml = `
    <hierarchy rotation="0">
      <node index="0" text="" resource-id="com.discord:id/chat_input_wrapper" class="android.widget.FrameLayout" focusable="false" />
      <node index="1" text="" resource-id="com.discord:id/message_input" class="android.widget.EditText" focusable="true" />
      <node index="2" text="" resource-id="com.discord:id/send" class="android.widget.Button" focusable="true" />
    </hierarchy>`;

  it('temukan EditText composer', () => {
    expect(parseComposerId(xml)).toBe('com.discord:id/message_input');
  });

  it('null kalau tidak ada kandidat', () => {
    expect(
      parseComposerId('<hierarchy><node resource-id="other:id/x" class="android.widget.TextView"/></hierarchy>'),
    ).toBeNull();
  });
});
