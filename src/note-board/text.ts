import { Text } from 'pixi.js';

export function createText() {
  const fontSize = 14;
  const text = new Text(
    '床前明月光\n疑是地上霜123\n举头望明月\n低头思故乡asdasd',
    {
      fill: 0x4ca486,
      fontFamily: `OpenSans, Arial, sans-serif, "Noto Sans Hebrew", "Noto Sans", "Noto Sans JP", "Noto Sans KR"`,
      fontSize,
      lineHeight: 1.2 * fontSize,
    }
  );
  text.cursor = 'pointer';
  text.interactive = true;
  return text;
}
