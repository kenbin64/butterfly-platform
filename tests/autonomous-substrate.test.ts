/**
 * AutonomousSubstrate Tests - Actor-Based NPC System
 * =================================================
 * 
 * All NPCs are actors performing visible, choreographed roles.
 * No hidden AI. No real harm. Everything is transparent and auditable.
 */

import { AutonomousSubstrate, AutonomousActor, Scene, NPCRole, BehaviorNode } from "../core/substrate/autonomous-substrate";

describe("AutonomousSubstrate - Actor-Based NPCs", () => {
  let autonomous: AutonomousSubstrate;

  beforeEach(() => {
    autonomous = new AutonomousSubstrate();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Create actors with visible roles
  // ═══════════════════════════════════════════════════════════════════════════

  test("Create autonomous actors with visible roles", () => {
    const dragonRole: NPCRole = {
      name: "Dragon",
      description: "A fierce dragon guarding treasure",
      capabilities: ["roar", "fly", "fire_breath"],
      alignment: "hostile",
      visible: true
    };

    const dragon = autonomous.createActor("dragon_1", dragonRole);
    expect(dragon).toBeDefined();

    const role = dragon.getRole();
    expect(role.name).toBe("Dragon");
    expect(role.visible).toBe(true);
    expect(role.capabilities).toContain("fire_breath");

    console.log(`✓ Created actor: ${dragonRole.name} (${dragonRole.description})`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Choreograph actor behavior
  // ═══════════════════════════════════════════════════════════════════════════

  test("Set choreographed script for actor", () => {
    const merchantRole: NPCRole = {
      name: "Merchant",
      description: "Friendly shopkeeper",
      capabilities: ["speak", "trade"],
      alignment: "friendly",
      visible: true
    };

    const merchant = autonomous.createActor("merchant_1", merchantRole);

    const script: BehaviorNode[] = [
      { action: "speak", parameters: { message: "Welcome, adventurer!" }, intensity: 50 },
      { action: "perform", choreography: "display_wares" },
      { action: "speak", parameters: { message: "What interests you?" }, intensity: 60 }
    ];

    merchant.setScript(script);

    const retrievedScript = merchant.getScript();
    expect(retrievedScript.length).toBe(3);
    expect(retrievedScript[0].action).toBe("speak");

    console.log(`✓ Choreographed ${retrievedScript.length}-action script for merchant`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Perform choreographed actions
  // ═══════════════════════════════════════════════════════════════════════════

  test("Execute choreographed performance", () => {
    const guardRole: NPCRole = {
      name: "Guard",
      description: "Castle guard",
      capabilities: ["roar", "attack", "retreat"],
      alignment: "neutral",
      visible: true
    };

    const guard = autonomous.createActor("guard_1", guardRole);

    const script: BehaviorNode[] = [
      { action: "speak", parameters: { message: "Halt! State your business!" } },
      { action: "roar", intensity: 75 },
      { action: "move", targetLocation: { x: 10, y: 10 } }
    ];

    guard.setScript(script);

    // Perform first action
    const result1 = guard.perform();
    expect(result1).toContain("Halt! State your business!");

    // Perform second action
    const result2 = guard.perform();
    expect(result2).toContain("roars dramatically");

    // Perform third action
    const result3 = guard.perform();
    expect(result3).toContain("moves to");

    console.log(`✓ Performance sequence:
      1) ${result1}
      2) ${result2}
      3) ${result3}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Get current objective (transparent goal)
  // ═══════════════════════════════════════════════════════════════════════════

  test("Current objective is visible and transparent", () => {
    const wolfRole: NPCRole = {
      name: "Wolf",
      description: "Wild animal performing threat behavior",
      capabilities: ["growl", "attack", "retreat"],
      alignment: "hostile",
      visible: true
    };

    const wolf = autonomous.createActor("wolf_1", wolfRole);

    const script: BehaviorNode[] = [
      { action: "roar", intensity: 60 },
      { action: "attack", target: "player_1", choreography: "lunge", intensity: 50 },
      { action: "retreat", parameters: { destination: "forest" } }
    ];

    wolf.setScript(script);

    // Objective is visible before performance
    const nextAction = wolf.getObjective();
    expect(nextAction).toBeDefined();
    expect(nextAction!.action).toBe("roar");

    // Perform
    wolf.perform();

    // Next objective visible
    const nextObjective = wolf.getObjective();
    expect(nextObjective!.action).toBe("attack");

    console.log(`✓ Objectives are transparent:
      Current: ${nextObjective!.action}
      (No hidden AI or emergent goals)`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Performance history (complete audit trail)
  // ═══════════════════════════════════════════════════════════════════════════

  test("Complete performance history is auditable", () => {
    const bardRole: NPCRole = {
      name: "Bard",
      description: "Entertainer",
      capabilities: ["speak", "perform"],
      alignment: "friendly",
      visible: true
    };

    const bard = autonomous.createActor("bard_1", bardRole);

    const script: BehaviorNode[] = [
      { action: "speak", parameters: { message: "A tale of heroes!" } },
      { action: "perform", choreography: "song" },
      { action: "speak", parameters: { message: "Thank you!" } }
    ];

    bard.setScript(script);

    // Perform all actions
    while (bard.isPerforming()) {
      bard.perform();
    }

    const log = bard.getPerformanceLog();
    expect(log.length).toBe(3);

    // Every action is tracked
    expect(log[0].action).toBe("speak");
    expect(log[1].action).toBe("perform");
    expect(log[2].action).toBe("speak");

    console.log(`✓ Performance audit trail (${log.length} actions):`);
    log.forEach((entry: any, i: number) => {
      console.log(`  ${i + 1}. [${new Date(entry.timestamp).toISOString()}] ${entry.result}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: Scenes (coordinated multi-actor performances)
  // ═══════════════════════════════════════════════════════════════════════════

  test("Create and execute choreographed scenes", () => {
    // Create dragon
    const dragonRole: NPCRole = {
      name: "Dragon",
      description: "Boss encounter",
      capabilities: ["roar", "attack"],
      alignment: "hostile",
      visible: true
    };
    const dragon = autonomous.createActor("dragon_boss", dragonRole);
    dragon.setScript([
      { action: "roar", intensity: 100 },
      { action: "attack", target: "player_1", choreography: "fire_breath", intensity: 75 }
    ]);

    // Create minion
    const minionRole: NPCRole = {
      name: "Minion",
      description: "Supporting villain",
      capabilities: ["attack"],
      alignment: "hostile",
      visible: true
    };
    const minion = autonomous.createActor("minion_1", minionRole);
    minion.setScript([
      { action: "attack", target: "player_1", choreography: "sword_strike", intensity: 40 },
      { action: "retreat", parameters: { destination: "safe_spot" } }
    ]);

    // Create scene
    const scene = autonomous.createScene("encounter_1", "Boss Battle");
    scene.addActor(dragon);
    scene.addActor(minion);

    // Execute one cycle
    const results = scene.performCycle();
    expect(results.size).toBe(2);

    console.log(`✓ Scene: "${scene.getSummary().name}" with ${scene.getSummary().actors} actors`);
    results.forEach((result, actor) => {
      console.log(`  ${actor}: ${result}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Run complete choreographed scene
  // ═══════════════════════════════════════════════════════════════════════════

  test("Run complete choreographed encounter", () => {
    // Create combatants
    const heroRole: NPCRole = {
      name: "Hero",
      description: "Player character (also performing a role)",
      capabilities: ["attack", "defend"],
      alignment: "friendly",
      visible: true
    };

    const villainRole: NPCRole = {
      name: "Villain",
      description: "Choreographed antagonist",
      capabilities: ["attack", "monologue", "retreat"],
      alignment: "hostile",
      visible: true
    };

    const hero = autonomous.createActor("hero", heroRole);
    const villain = autonomous.createActor("villain", villainRole);

    // Both have choreographed scripts (not real combat)
    hero.setScript([
      { action: "speak", parameters: { message: "For justice!" } },
      { action: "attack", target: "villain", choreography: "sword_strike", intensity: 50 },
      { action: "perform", choreography: "victory_pose" }
    ]);

    villain.setScript([
      { action: "speak", parameters: { message: "You dare challenge me?!" } },
      { action: "attack", target: "hero", choreography: "dark_magic", intensity: 60 },
      { action: "retreat", parameters: { destination: "portal" } }
    ]);

    const scene = autonomous.createScene("duel", "Theatrical Duel");
    scene.addActor(hero);
    scene.addActor(villain);

    // Run to completion
    const timeline = scene.runToCompletion();

    const summary = scene.getSummary();
    console.log(`✓ Choreographed scene complete:
      Scene: ${summary.name}
      Duration: ${summary.duration}ms
      Events: ${summary.events}
      Actors: ${summary.actors}`);

    timeline.forEach(actorTimeline => {
      console.log(`\n  ${actorTimeline.actor}:`);
      actorTimeline.timeline.slice(0, 3).forEach(event => {
        console.log(`    - ${event}`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 8: Scene event log (complete audit)
  // ═══════════════════════════════════════════════════════════════════════════

  test("Scene event log is fully auditable", () => {
    const npcRole: NPCRole = {
      name: "NPC",
      description: "Test actor",
      capabilities: ["speak", "move"],
      alignment: "neutral",
      visible: true
    };

    const npc = autonomous.createActor("npc_1", npcRole);
    npc.setScript([
      { action: "speak", parameters: { message: "Hello" } },
      { action: "move", targetLocation: { x: 5, y: 5 } }
    ]);

    const scene = autonomous.createScene("test_scene", "Test");
    scene.addActor(npc);

    // Execute
    scene.performCycle();
    scene.performCycle();

    const eventLog = scene.getEventLog();
    expect(eventLog.length).toBeGreaterThan(0);

    // Events are timestamped and traceable
    console.log(`✓ Scene audit log: ${eventLog.length} entries (including joins)`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 9: Global substrate statistics
  // ═══════════════════════════════════════════════════════════════════════════

  test("Substrate tracks all actors and scenes", () => {
    // Create multiple actors
    for (let i = 0; i < 5; i++) {
      const role: NPCRole = {
        name: `Actor_${i}`,
        description: "Test actor",
        capabilities: ["perform"],
        alignment: "neutral",
        visible: true
      };
      const actor = autonomous.createActor(`actor_${i}`, role);
      actor.setScript([{ action: "perform", choreography: `action_${i}` }]);
      while (actor.isPerforming()) {
        actor.perform();
      }
    }

    // Create scenes
    autonomous.createScene("scene_1", "Scene 1");
    autonomous.createScene("scene_2", "Scene 2");

    const stats = autonomous.getStats();
    expect(stats.totalActors).toBe(5);
    expect(stats.totalScenes).toBe(2);
    expect(stats.totalActions).toBeGreaterThan(0);

    console.log(`✓ Substrate statistics:
      Actors: ${stats.totalActors}
      Scenes: ${stats.totalScenes}
      Total actions performed: ${stats.totalActions}
      Audit log entries: ${stats.auditLogEntries}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 11: Actor authentication - NPCs know it's a game but play authentically
  // ═══════════════════════════════════════════════════════════════════════════

  test("NPCs have meta-awareness but play authentic character roles", () => {
    const dragonRole: NPCRole = {
      name: "Dragon",
      description: "A fierce hoard-guardian who sees all who approach as thieves",
      archetype: "Predator",
      capabilities: ["roar", "attack", "defend"],
      alignment: "hostile",
      visible: true,
      motivation: "Protect hoard from thieves",
      responseStyle: "Proud, territorial, intelligent"
    };

    const dragon = autonomous.createActor("dragon_1", dragonRole);
    const perspective = dragon.getCharacterPerspective();

    console.log(`✓ NPC Character Perspective:
      Meta: "${perspective.metaAwareness}"
      
      Character: "${perspective.characterCommitment}"
      
      Authenticity: "${perspective.roleAuthenticity}"`);

    // Dragon KNOWS it's an actor but commits fully to character
    expect(perspective.metaAwareness).toContain("game world");
    expect(perspective.characterCommitment).toContain("Dragon");
    expect(perspective.roleAuthenticity).toContain("Protect hoard");
  });


  test("Actor state reflects choreography", () => {
    const actorRole: NPCRole = {
      name: "Mobile_Actor",
      description: "Actor that moves",
      archetype: "Wanderer",
      capabilities: ["move"],
      alignment: "neutral",
      visible: true
    };

    const actor = autonomous.createActor("mobile", actorRole);

    let state = actor.getState();
    expect(state.position).toEqual({ x: 0, y: 0 });
    expect(state.currentAction).toBe("idle");

    // Perform movement
    actor.setScript([{ action: "move", targetLocation: { x: 25, y: 50 } }]);
    actor.perform();

    state = actor.getState();
    expect(state.position).toEqual({ x: 25, y: 50 });
    expect(state.currentAction).toBe("move");

    console.log(`✓ Actor state after choreography: position=${JSON.stringify(state.position)}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TEST: Full narrative scene
// ═══════════════════════════════════════════════════════════════════════════

describe("AutonomousSubstrate - Full Narrative", () => {
  test("Complete fantasy tavern scene with multiple actors", () => {
    const autonomous = new AutonomousSubstrate();

    // Create tavern keeper
    const tavernRole: NPCRole = {
      name: "Tavern Keeper",
      description: "Proprietor",
      archetype: "Merchant",
      capabilities: ["speak", "serve"],
      alignment: "friendly",
      visible: true
    };
    const tavern = autonomous.createActor("tavern_keeper", tavernRole);
    tavern.setScript([
      { action: "speak", parameters: { message: "Welcome to the Wandering Griffin!" } },
      { action: "perform", choreography: "pour_drink" }
    ]);

    // Create mysterious stranger
    const strangerRole: NPCRole = {
      name: "Mysterious Stranger",
      description: "Quest giver",
      archetype: "Herald",
      capabilities: ["speak", "gesture"],
      alignment: "neutral",
      visible: true
    };
    const stranger = autonomous.createActor("stranger", strangerRole);
    stranger.setScript([
      { action: "speak", parameters: { message: "Pssst... I have a job for you..." } },
      { action: "perform", choreography: "hand_over_contract" }
    ]);

    // Create scene
    const scene = autonomous.createScene("tavern_scene", "Call to Adventure");
    scene.addActor(tavern);
    scene.addActor(stranger);

    // Run
    const timeline = scene.runToCompletion();
    const summary = scene.getSummary();

    console.log(`✓ Narrative scene: "${summary.name}"
      Actors: ${summary.actors}
      Events: ${summary.events}
      Duration: ${summary.duration}ms
      
      This is a choreographed scene, not a simulation.
      All actors knew their lines and movements in advance.
      No emergent behavior. Pure collaborative storytelling.`);

    expect(summary.actors).toBe(2);
    expect(summary.events).toBeGreaterThan(2);
  });
});
