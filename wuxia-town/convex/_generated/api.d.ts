/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent_conversation from "../agent/conversation.js";
import type * as agent_embeddingsCache from "../agent/embeddingsCache.js";
import type * as agent_memory from "../agent/memory.js";
import type * as aiTown_agent from "../aiTown/agent.js";
import type * as aiTown_agentDescription from "../aiTown/agentDescription.js";
import type * as aiTown_agentInputs from "../aiTown/agentInputs.js";
import type * as aiTown_agentOperations from "../aiTown/agentOperations.js";
import type * as aiTown_conversation from "../aiTown/conversation.js";
import type * as aiTown_conversationMembership from "../aiTown/conversationMembership.js";
import type * as aiTown_game from "../aiTown/game.js";
import type * as aiTown_ids from "../aiTown/ids.js";
import type * as aiTown_inputHandler from "../aiTown/inputHandler.js";
import type * as aiTown_inputs from "../aiTown/inputs.js";
import type * as aiTown_insertInput from "../aiTown/insertInput.js";
import type * as aiTown_location from "../aiTown/location.js";
import type * as aiTown_main from "../aiTown/main.js";
import type * as aiTown_movement from "../aiTown/movement.js";
import type * as aiTown_player from "../aiTown/player.js";
import type * as aiTown_playerDescription from "../aiTown/playerDescription.js";
import type * as aiTown_world from "../aiTown/world.js";
import type * as aiTown_worldMap from "../aiTown/worldMap.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as engine_abstractGame from "../engine/abstractGame.js";
import type * as engine_historicalObject from "../engine/historicalObject.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as messages from "../messages.js";
import type * as music from "../music.js";
import type * as testing from "../testing.js";
import type * as util_FastIntegerCompression from "../util/FastIntegerCompression.js";
import type * as util_assertNever from "../util/assertNever.js";
import type * as util_asyncMap from "../util/asyncMap.js";
import type * as util_compression from "../util/compression.js";
import type * as util_geometry from "../util/geometry.js";
import type * as util_isSimpleObject from "../util/isSimpleObject.js";
import type * as util_llm from "../util/llm.js";
import type * as util_minheap from "../util/minheap.js";
import type * as util_object from "../util/object.js";
import type * as util_sleep from "../util/sleep.js";
import type * as util_types from "../util/types.js";
import type * as util_xxhash from "../util/xxhash.js";
import type * as world from "../world.js";
import type * as wuxia_canonical from "../wuxia/canonical.js";
import type * as wuxia_clock from "../wuxia/clock.js";
import type * as wuxia_hash from "../wuxia/hash.js";
import type * as wuxia_inputs from "../wuxia/inputs.js";
import type * as wuxia_journal from "../wuxia/journal.js";
import type * as wuxia_llmBudget from "../wuxia/llmBudget.js";
import type * as wuxia_registry from "../wuxia/registry.js";
import type * as wuxia_rng from "../wuxia/rng.js";
import type * as wuxia_sha256 from "../wuxia/sha256.js";
import type * as wuxia_state from "../wuxia/state.js";
import type * as wuxia_steps from "../wuxia/steps.js";
import type * as wuxia_templates from "../wuxia/templates.js";
import type * as wuxia_w01_skin_index from "../wuxia/w01_skin/index.js";
import type * as wuxia_w02_folk_guard from "../wuxia/w02_folk/guard.js";
import type * as wuxia_w02_folk_index from "../wuxia/w02_folk/index.js";
import type * as wuxia_w02_folk_prompt from "../wuxia/w02_folk/prompt.js";
import type * as wuxia_w03_life_data from "../wuxia/w03_life/data.js";
import type * as wuxia_w03_life_index from "../wuxia/w03_life/index.js";
import type * as wuxia_w04_dojo_data from "../wuxia/w04_dojo/data.js";
import type * as wuxia_w04_dojo_index from "../wuxia/w04_dojo/index.js";
import type * as wuxia_w05_mind_data from "../wuxia/w05_mind/data.js";
import type * as wuxia_w05_mind_index from "../wuxia/w05_mind/index.js";
import type * as wuxia_w06_spar_data from "../wuxia/w06_spar/data.js";
import type * as wuxia_w06_spar_duel from "../wuxia/w06_spar/duel.js";
import type * as wuxia_w06_spar_index from "../wuxia/w06_spar/index.js";
import type * as wuxia_w06_spar_narrate from "../wuxia/w06_spar/narrate.js";
import type * as wuxia_w06_spar_narration from "../wuxia/w06_spar/narration.js";
import type * as wuxia_w08_jianghu_chronicle from "../wuxia/w08_jianghu/chronicle.js";
import type * as wuxia_w08_jianghu_common from "../wuxia/w08_jianghu/common.js";
import type * as wuxia_w08_jianghu_data from "../wuxia/w08_jianghu/data.js";
import type * as wuxia_w08_jianghu_events_bandit from "../wuxia/w08_jianghu/events/bandit.js";
import type * as wuxia_w08_jianghu_events_story from "../wuxia/w08_jianghu/events/story.js";
import type * as wuxia_w08_jianghu_events_xiake from "../wuxia/w08_jianghu/events/xiake.js";
import type * as wuxia_w08_jianghu_events_xiaobi from "../wuxia/w08_jianghu/events/xiaobi.js";
import type * as wuxia_w08_jianghu_index from "../wuxia/w08_jianghu/index.js";
import type * as wuxia_w08_jianghu_rewrite from "../wuxia/w08_jianghu/rewrite.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agent/conversation": typeof agent_conversation;
  "agent/embeddingsCache": typeof agent_embeddingsCache;
  "agent/memory": typeof agent_memory;
  "aiTown/agent": typeof aiTown_agent;
  "aiTown/agentDescription": typeof aiTown_agentDescription;
  "aiTown/agentInputs": typeof aiTown_agentInputs;
  "aiTown/agentOperations": typeof aiTown_agentOperations;
  "aiTown/conversation": typeof aiTown_conversation;
  "aiTown/conversationMembership": typeof aiTown_conversationMembership;
  "aiTown/game": typeof aiTown_game;
  "aiTown/ids": typeof aiTown_ids;
  "aiTown/inputHandler": typeof aiTown_inputHandler;
  "aiTown/inputs": typeof aiTown_inputs;
  "aiTown/insertInput": typeof aiTown_insertInput;
  "aiTown/location": typeof aiTown_location;
  "aiTown/main": typeof aiTown_main;
  "aiTown/movement": typeof aiTown_movement;
  "aiTown/player": typeof aiTown_player;
  "aiTown/playerDescription": typeof aiTown_playerDescription;
  "aiTown/world": typeof aiTown_world;
  "aiTown/worldMap": typeof aiTown_worldMap;
  constants: typeof constants;
  crons: typeof crons;
  "engine/abstractGame": typeof engine_abstractGame;
  "engine/historicalObject": typeof engine_historicalObject;
  http: typeof http;
  init: typeof init;
  messages: typeof messages;
  music: typeof music;
  testing: typeof testing;
  "util/FastIntegerCompression": typeof util_FastIntegerCompression;
  "util/assertNever": typeof util_assertNever;
  "util/asyncMap": typeof util_asyncMap;
  "util/compression": typeof util_compression;
  "util/geometry": typeof util_geometry;
  "util/isSimpleObject": typeof util_isSimpleObject;
  "util/llm": typeof util_llm;
  "util/minheap": typeof util_minheap;
  "util/object": typeof util_object;
  "util/sleep": typeof util_sleep;
  "util/types": typeof util_types;
  "util/xxhash": typeof util_xxhash;
  world: typeof world;
  "wuxia/canonical": typeof wuxia_canonical;
  "wuxia/clock": typeof wuxia_clock;
  "wuxia/hash": typeof wuxia_hash;
  "wuxia/inputs": typeof wuxia_inputs;
  "wuxia/journal": typeof wuxia_journal;
  "wuxia/llmBudget": typeof wuxia_llmBudget;
  "wuxia/registry": typeof wuxia_registry;
  "wuxia/rng": typeof wuxia_rng;
  "wuxia/sha256": typeof wuxia_sha256;
  "wuxia/state": typeof wuxia_state;
  "wuxia/steps": typeof wuxia_steps;
  "wuxia/templates": typeof wuxia_templates;
  "wuxia/w01_skin/index": typeof wuxia_w01_skin_index;
  "wuxia/w02_folk/guard": typeof wuxia_w02_folk_guard;
  "wuxia/w02_folk/index": typeof wuxia_w02_folk_index;
  "wuxia/w02_folk/prompt": typeof wuxia_w02_folk_prompt;
  "wuxia/w03_life/data": typeof wuxia_w03_life_data;
  "wuxia/w03_life/index": typeof wuxia_w03_life_index;
  "wuxia/w04_dojo/data": typeof wuxia_w04_dojo_data;
  "wuxia/w04_dojo/index": typeof wuxia_w04_dojo_index;
  "wuxia/w05_mind/data": typeof wuxia_w05_mind_data;
  "wuxia/w05_mind/index": typeof wuxia_w05_mind_index;
  "wuxia/w06_spar/data": typeof wuxia_w06_spar_data;
  "wuxia/w06_spar/duel": typeof wuxia_w06_spar_duel;
  "wuxia/w06_spar/index": typeof wuxia_w06_spar_index;
  "wuxia/w06_spar/narrate": typeof wuxia_w06_spar_narrate;
  "wuxia/w06_spar/narration": typeof wuxia_w06_spar_narration;
  "wuxia/w08_jianghu/chronicle": typeof wuxia_w08_jianghu_chronicle;
  "wuxia/w08_jianghu/common": typeof wuxia_w08_jianghu_common;
  "wuxia/w08_jianghu/data": typeof wuxia_w08_jianghu_data;
  "wuxia/w08_jianghu/events/bandit": typeof wuxia_w08_jianghu_events_bandit;
  "wuxia/w08_jianghu/events/story": typeof wuxia_w08_jianghu_events_story;
  "wuxia/w08_jianghu/events/xiake": typeof wuxia_w08_jianghu_events_xiake;
  "wuxia/w08_jianghu/events/xiaobi": typeof wuxia_w08_jianghu_events_xiaobi;
  "wuxia/w08_jianghu/index": typeof wuxia_w08_jianghu_index;
  "wuxia/w08_jianghu/rewrite": typeof wuxia_w08_jianghu_rewrite;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
