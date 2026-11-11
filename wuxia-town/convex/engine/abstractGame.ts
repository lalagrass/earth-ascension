import { ConvexError, Infer, Value, v } from 'convex/values';
import { Doc, Id } from '../_generated/dataModel';
import { ActionCtx, DatabaseReader, MutationCtx, internalQuery } from '../_generated/server';
import { engine } from '../engine/schema';
import { internal } from '../_generated/api';

export abstract class AbstractGame {
  abstract tickDuration: number;
  abstract stepDuration: number;
  abstract maxTicksPerStep: number;
  abstract maxInputsPerStep: number;

  constructor(public engine: Doc<'engines'>) {}

  abstract handleInput(now: number, name: string, args: object): Value;
  abstract tick(now: number): void;

  // Optional callback at the beginning of each step.
  beginStep(now: number) {}
  // WUXIA-PATCH(W0): 多帶 step 邊界紀錄
  abstract saveStep(
    ctx: ActionCtx,
    engineUpdate: EngineUpdate,
    stepRecord?: WuxiaStepBoundary,
  ): Promise<void>;

  async runStep(ctx: ActionCtx, now: number) {
    const inputs = await ctx.runQuery(internal.engine.abstractGame.loadInputs, {
      engineId: this.engine._id,
      processedInputNumber: this.engine.processedInputNumber,
      max: this.maxInputsPerStep,
    });

    // WUXIA-PATCH(W0): 把純計算的部分抽成 simulateStep()，讓無頭模擬與重播跑同一段程式；
    // 並把 step 邊界 {generation, startTs, endTs, now, ...} 交給 saveStep 寫進 wuxiaSteps。
    const { engineUpdate, stepRecord } = this.simulateStep(inputs, now);
    await this.saveStep(ctx, engineUpdate, stepRecord);

    console.debug(
      `Simulated from ${stepRecord.startTs} to ${stepRecord.endTs} (${
        stepRecord.endTs - stepRecord.startTs
      }ms)`,
    );
  }

  // WUXIA-PATCH(W0): 原 runStep 的模擬迴圈，邏輯不變，只是不碰資料庫。
  simulateStep(
    inputs: Array<Pick<Doc<'inputs'>, '_id' | 'number' | 'name' | 'args' | 'received'>>,
    now: number,
  ): { engineUpdate: EngineUpdate; stepRecord: WuxiaStepBoundary } {
    const lastStepTs = this.engine.currentTime;
    const startTs = lastStepTs ? lastStepTs + this.tickDuration : now;
    let currentTs = startTs;
    let inputIndex = 0;
    let numTicks = 0;
    let processedInputNumber = this.engine.processedInputNumber;
    const completedInputs = [];

    this.beginStep(currentTs);

    while (numTicks < this.maxTicksPerStep) {
      numTicks += 1;

      // Collect all of the inputs for this tick.
      const tickInputs = [];
      while (inputIndex < inputs.length) {
        const input = inputs[inputIndex];
        if (input.received > currentTs) {
          break;
        }
        inputIndex += 1;
        processedInputNumber = input.number;
        tickInputs.push(input);
      }

      // Feed the inputs to the game.
      for (const input of tickInputs) {
        let returnValue;
        try {
          const value = this.handleInput(currentTs, input.name, input.args);
          returnValue = { kind: 'ok' as const, value };
        } catch (e: any) {
          console.error(`Input ${input._id} failed: ${e.message}`);
          returnValue = { kind: 'error' as const, message: e.message };
        }
        completedInputs.push({ inputId: input._id, returnValue });
      }

      // Simulate the game forward one tick.
      this.tick(currentTs);

      const candidateTs = currentTs + this.tickDuration;
      if (now < candidateTs) {
        break;
      }
      currentTs = candidateTs;
    }

    // Commit the step by moving time forward, consuming our inputs, and saving the game's state.
    const expectedGenerationNumber = this.engine.generationNumber;
    this.engine.currentTime = currentTs;
    this.engine.lastStepTs = lastStepTs;
    this.engine.generationNumber += 1;
    this.engine.processedInputNumber = processedInputNumber;
    const { _id, _creationTime, ...engine } = this.engine;
    const engineUpdate = { engine, completedInputs, expectedGenerationNumber };
    // WUXIA-PATCH(W0): step 邊界紀錄（重播用）
    const stepRecord: WuxiaStepBoundary = {
      generation: expectedGenerationNumber,
      startTs,
      endTs: currentTs,
      now,
      prevTime: lastStepTs,
      numTicks,
      inputsThrough: inputs.length > 0 ? inputs[inputs.length - 1].number : undefined,
      processedInputNumber,
    };
    return { engineUpdate, stepRecord };
  }
}

// WUXIA-PATCH(W0): step 邊界紀錄的型別（hash 由 Game.saveStep 補上）
export type WuxiaStepBoundary = {
  generation: number;
  startTs: number;
  endTs: number;
  now: number;
  prevTime?: number;
  numTicks: number;
  inputsThrough?: number;
  processedInputNumber?: number;
};

const completedInput = v.object({
  inputId: v.id('inputs'),
  returnValue: v.union(
    v.object({
      kind: v.literal('ok'),
      value: v.any(),
    }),
    v.object({
      kind: v.literal('error'),
      message: v.string(),
    }),
  ),
});

export const engineUpdate = v.object({
  engine,
  expectedGenerationNumber: v.number(),
  completedInputs: v.array(completedInput),
});
export type EngineUpdate = Infer<typeof engineUpdate>;

export async function loadEngine(
  db: DatabaseReader,
  engineId: Id<'engines'>,
  generationNumber: number,
) {
  const engine = await db.get(engineId);
  if (!engine) {
    throw new Error(`No engine found with id ${engineId}`);
  }
  if (!engine.running) {
    throw new ConvexError({
      kind: 'engineNotRunning',
      message: `Engine ${engineId} is not running`,
    });
  }
  if (engine.generationNumber !== generationNumber) {
    throw new ConvexError({ kind: 'generationNumber', message: 'Generation number mismatch' });
  }
  return engine;
}

export async function engineInsertInput(
  ctx: MutationCtx,
  engineId: Id<'engines'>,
  name: string,
  args: any,
): Promise<Id<'inputs'>> {
  const now = Date.now();
  const prevInput = await ctx.db
    .query('inputs')
    .withIndex('byInputNumber', (q) => q.eq('engineId', engineId))
    .order('desc')
    .first();
  const number = prevInput ? prevInput.number + 1 : 0;
  const inputId = await ctx.db.insert('inputs', {
    engineId,
    number,
    name,
    args,
    received: now,
  });
  return inputId;
}

export const loadInputs = internalQuery({
  args: {
    engineId: v.id('engines'),
    processedInputNumber: v.optional(v.number()),
    max: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('inputs')
      .withIndex('byInputNumber', (q) =>
        q.eq('engineId', args.engineId).gt('number', args.processedInputNumber ?? -1),
      )
      .order('asc')
      .take(args.max);
  },
});

export async function applyEngineUpdate(
  ctx: MutationCtx,
  engineId: Id<'engines'>,
  update: EngineUpdate,
) {
  const engine = await loadEngine(ctx.db, engineId, update.expectedGenerationNumber);
  if (
    engine.currentTime &&
    update.engine.currentTime &&
    update.engine.currentTime < engine.currentTime
  ) {
    throw new Error('Time moving backwards');
  }
  await ctx.db.replace(engine._id, update.engine);

  for (const completedInput of update.completedInputs) {
    const input = await ctx.db.get(completedInput.inputId);
    if (!input) {
      throw new Error(`Input ${completedInput.inputId} not found`);
    }
    if (input.returnValue) {
      throw new Error(`Input ${completedInput.inputId} already completed`);
    }
    input.returnValue = completedInput.returnValue;
    await ctx.db.replace(input._id, input);
  }
}
