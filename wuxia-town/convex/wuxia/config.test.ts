import { EMBEDDING_DIMENSION } from '../util/llm';
import { defaultWuxiaConfig, keepAliveEnabled } from './state';

describe('#562 W0 additions', () => {
  test('embedding dimension comes from data/wuxia/world.config.json (default 1024 = Ollama mxbai)', () => {
    expect(defaultWuxiaConfig.embeddingDimension).toBe(1024);
    expect(EMBEDDING_DIMENSION).toBe(defaultWuxiaConfig.embeddingDimension);
  });
  test('keepAlive defaults off; config or WUXIA_KEEP_ALIVE=1 turns it on', () => {
    const old = process.env.WUXIA_KEEP_ALIVE;
    delete process.env.WUXIA_KEEP_ALIVE;
    expect(keepAliveEnabled()).toBe(false);
    expect(keepAliveEnabled({ ...defaultWuxiaConfig, keepAlive: true })).toBe(true);
    process.env.WUXIA_KEEP_ALIVE = '1';
    expect(keepAliveEnabled()).toBe(true);
    if (old === undefined) delete process.env.WUXIA_KEEP_ALIVE;
    else process.env.WUXIA_KEEP_ALIVE = old;
  });
});
