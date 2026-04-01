"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifoldTransaction = exports.ManifoldFacade = void 0;
const dimensional_1 = require("../dimensional");
const entity_store_1 = require("../substrate/entity-store");
/**
 * Manifold Facade Pattern
 *
 * High-level developer-friendly API that automatically translates to manifold-native code.
 * This facade allows developers to work with familiar patterns while getting the benefits
 * of manifold optimization, dimensional programming, and substrate alignment.
 */
class ManifoldFacade {
    constructor(name) {
        this.entityStore = new entity_store_1.EntityStore(name);
        this.dimensionalState = new dimensional_1.Dimension({});
    }
    /**
     * High-level entity management with automatic manifold conversion
     */
    createEntity(id, type, properties) {
        // Convert high-level entity to manifold-native format
        const manifoldEntity = this.convertToManifoldEntity(id, type, properties);
        this.entityStore.set(id, manifoldEntity);
        // Update dimensional state
        this.updateDimensionalState("entities", "created", id);
    }
    updateEntity(id, updates) {
        const currentEntity = this.entityStore.get(id);
        if (!currentEntity)
            return;
        // Merge updates with manifold-aware logic
        const updatedEntity = this.mergeManifoldUpdates(currentEntity, updates);
        this.entityStore.set(id, updatedEntity);
        this.updateDimensionalState("entities", "updated", id);
    }
    getEntity(id) {
        const entity = this.entityStore.get(id);
        return this.convertFromManifoldEntity(entity);
    }
    /**
     * High-level physics simulation with automatic manifold optimization
     */
    simulatePhysics(entities, deltaTime) {
        // Convert to manifold-native physics calculations
        const manifoldPhysics = this.convertToManifoldPhysics(entities, deltaTime);
        // Apply manifold-based physics updates
        manifoldPhysics.forEach(update => {
            this.updateEntity(update.id, update.properties);
        });
        this.updateDimensionalState("physics", "simulated", entities.length);
    }
    /**
     * High-level state management with dimensional programming
     */
    setState(key, value) {
        // Create dimensional state update
        const dimension = this.dimensionalState.drill("state", key);
        dimension.value = value;
        // Apply manifold optimization
        this.optimizeDimensionalState(key, value);
    }
    getState(key) {
        const dimension = this.dimensionalState.drill("state", key);
        return dimension.value;
    }
    /**
     * High-level rendering with automatic manifold conversion
     */
    render(entities, canvas) {
        // Convert rendering to manifold-native operations
        const manifoldRender = this.convertToManifoldRender(entities, canvas);
        // Apply optimized rendering
        this.applyManifoldRendering(manifoldRender);
        this.updateDimensionalState("rendering", "completed", entities.length);
    }
    /**
     * High-level AI decision making with manifold optimization
     */
    makeDecision(entityId, context) {
        const entity = this.getEntity(entityId);
        // Convert decision making to manifold-native logic
        const manifoldDecision = this.convertToManifoldDecision(entity, context);
        // Apply manifold optimization for decision making
        const optimizedDecision = this.optimizeManifoldDecision(manifoldDecision);
        this.updateDimensionalState("ai", "decision", entityId);
        return optimizedDecision;
    }
    /**
     * High-level optimization with automatic manifold supercharging
     */
    optimizeLevel(level) {
        // Apply manifold supercharger at different levels
        switch (level) {
            case 1:
                this.applyBasicOptimization();
                break;
            case 2:
                this.applyIntermediateOptimization();
                break;
            case 3:
                this.applyAdvancedOptimization();
                break;
            case 4:
                this.applyExpertOptimization();
                break;
            case 5:
                this.applyMasterOptimization();
                break;
        }
        // Track the current level via drill so getStats() can read it back
        this.dimensionalState.drill("optimization", "level").value = level;
        this.updateDimensionalState("optimization", "level", level);
    }
    /**
     * High-level transaction management with manifold consistency
     */
    beginTransaction() {
        return new ManifoldTransaction(this);
    }
    /**
     * Internal conversion methods - automatically handle manifold math
     */
    convertToManifoldEntity(id, type, properties) {
        return {
            id,
            type,
            manifold: {
                created: Date.now(),
                version: 1,
                dimensions: this.extractDimensions(properties)
            },
            ...properties
        };
    }
    convertFromManifoldEntity(entity) {
        if (!entity)
            return null;
        // Extract high-level properties, hiding manifold internals
        const { manifold, ...highLevelProps } = entity;
        return highLevelProps;
    }
    mergeManifoldUpdates(current, updates) {
        return {
            ...current,
            ...updates,
            manifold: {
                ...current.manifold,
                version: current.manifold.version + 1,
                lastUpdated: Date.now()
            }
        };
    }
    convertToManifoldPhysics(entities, _deltaTime) {
        // Entities arrive with their positions already computed by the caller.
        // The facade's job is to persist those positions into the entity store,
        // not to apply another round of velocity integration.
        return entities.map(entity => ({
            id: entity.id,
            properties: {
                position: entity.position,
                velocity: entity.velocity
            }
        }));
    }
    convertToManifoldRender(entities, canvas) {
        return {
            entities: entities.map(e => ({
                id: e.id,
                type: e.type,
                position: e.position,
                properties: this.extractRenderProperties(e)
            })),
            canvas: {
                width: canvas.width,
                height: canvas.height
            },
            manifold: {
                timestamp: Date.now(),
                optimization: this.dimensionalState.drill("optimization", "level").value || 1
            }
        };
    }
    applyManifoldRendering(renderData) {
        // This would contain the actual manifold-native rendering logic
        // For now, it's a placeholder showing the pattern
        console.log(`Manifold rendering ${renderData.entities.length} entities`);
    }
    convertToManifoldDecision(entity, context) {
        // Convert high-level decision logic to manifold-native
        return {
            entity,
            context,
            manifold: {
                decisionSpace: this.createDecisionSpace(entity, context),
                probability: this.calculateDecisionProbability(entity, context)
            }
        };
    }
    optimizeManifoldDecision(decision) {
        // Apply manifold optimization to decision making
        const optimizationLevel = this.dimensionalState.drill("optimization", "level").value || 1;
        return {
            ...decision,
            optimized: true,
            efficiency: optimizationLevel * 0.2,
            manifold: {
                ...decision.manifold,
                optimized: true
            }
        };
    }
    extractDimensions(properties) {
        // Extract dimensional information from properties
        return Object.keys(properties).reduce((dims, key) => {
            dims[key] = {
                type: typeof properties[key],
                manifold: true
            };
            return dims;
        }, {});
    }
    extractRenderProperties(entity) {
        // Extract only render-relevant properties
        return {
            color: entity.color || "#ffffff",
            size: entity.size || 10,
            visible: entity.visible !== false
        };
    }
    createDecisionSpace(entity, context) {
        // Create manifold decision space
        return {
            options: this.generateOptions(entity, context),
            constraints: this.extractConstraints(entity, context),
            manifold: true
        };
    }
    calculateDecisionProbability(entity, context) {
        // Calculate decision probability using manifold math
        return Math.random(); // Placeholder for actual manifold calculation
    }
    generateOptions(entity, context) {
        // Generate decision options
        return ["move", "attack", "defend", "wait"].map(option => ({
            type: option,
            probability: Math.random(),
            manifold: true
        }));
    }
    extractConstraints(entity, context) {
        // Extract constraints for decision making
        return {
            energy: entity.energy || 100,
            position: entity.position,
            threats: context.threats || [],
            manifold: true
        };
    }
    optimizeDimensionalState(key, value) {
        // Apply manifold optimization to dimensional state
        const currentOptimization = this.dimensionalState.drill("optimization", "level").value || 1;
        if (currentOptimization >= 3) {
            // Apply advanced manifold optimizations
            this.dimensionalState.drill("optimized", key).value = value;
        }
    }
    applyBasicOptimization() {
        // Basic manifold optimization
        this.dimensionalState.drill("optimization", "strategy").value = "basic";
    }
    applyIntermediateOptimization() {
        // Intermediate manifold optimization
        this.dimensionalState.drill("optimization", "strategy").value = "intermediate";
    }
    applyAdvancedOptimization() {
        // Advanced manifold optimization
        this.dimensionalState.drill("optimization", "strategy").value = "advanced";
    }
    applyExpertOptimization() {
        // Expert manifold optimization
        this.dimensionalState.drill("optimization", "strategy").value = "expert";
    }
    applyMasterOptimization() {
        // Master manifold optimization
        this.dimensionalState.drill("optimization", "strategy").value = "master";
    }
    updateDimensionalState(category, action, target) {
        const timestamp = String(Date.now());
        this.dimensionalState.drill("history", timestamp).value = {
            category,
            action,
            target,
            manifold: true
        };
    }
    getStats() {
        return {
            entities: this.entityStore.getAll().length,
            // drill() into "state" — returns the Dimension node; always defined
            dimensionalState: this.dimensionalState.drill("state"),
            optimization: this.dimensionalState.drill("optimization", "level").value || 1,
            memoryUsage: this.entityStore.getStats()
        };
    }
}
exports.ManifoldFacade = ManifoldFacade;
/**
 * Manifold Transaction - High-level transaction management
 */
class ManifoldTransaction {
    constructor(facade) {
        this.operations = [];
        this.committed = false;
        this.facade = facade;
    }
    createEntity(id, entityType, properties) {
        // Use separate keys for operation type vs entity type to avoid shadowing
        this.operations.push({
            op: "create",
            id,
            entityType,
            properties
        });
        return this;
    }
    updateEntity(id, updates) {
        this.operations.push({
            op: "update",
            id,
            updates
        });
        return this;
    }
    removeEntity(id) {
        this.operations.push({
            op: "remove",
            id
        });
        return this;
    }
    commit() {
        if (this.committed)
            return false;
        try {
            // Apply all operations in manifold-consistent order
            this.operations.forEach(op => {
                switch (op.op) {
                    case "create":
                        this.facade.createEntity(op.id, op.entityType, op.properties);
                        break;
                    case "update":
                        this.facade.updateEntity(op.id, op.updates);
                        break;
                    case "remove":
                        // Remove logic would go here
                        break;
                }
            });
            this.committed = true;
            return true;
        }
        catch (error) {
            console.error("Manifold transaction failed:", error);
            return false;
        }
    }
    rollback() {
        if (this.committed)
            return;
        // Rollback logic would go here
        this.operations = [];
    }
}
exports.ManifoldTransaction = ManifoldTransaction;
