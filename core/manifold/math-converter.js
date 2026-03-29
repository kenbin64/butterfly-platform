"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifoldMathConverter = void 0;
const _7_segment_state_1 = require("./7-segment-state");
const dimensional_1 = require("../dimensional");
/**
 * Manifold Math Converter
 *
 * Converts high-level operations (create, update, delete entities) into
 * low-level 7-segment manifold operations with automatic optimization.
 *
 * This is the core translation layer that makes the Manifold Facade possible.
 */
class ManifoldMathConverter {
    constructor(initialState) {
        /**
         * Default segment operators for operations that don't need specific logic
         */
        this.defaultIdentity = (state) => ({ ...state });
        this.defaultRelation = (state) => ({ ...state });
        this.defaultGeometry = (state) => ({ ...state });
        this.defaultExpression = (state) => ({ ...state });
        this.defaultCollapse = (state) => ({ ...state });
        this.defaultCreation = (state) => ({ ...state });
        this.defaultGovernance = (state) => ({ ...state });
        this.currentManifoldState = (0, _7_segment_state_1.createManifoldState)(initialState);
        this.dimension = new dimensional_1.Dimension({});
    }
    /**
     * Convert entity creation to manifold operations
     */
    convertEntityCreation(entityId, entityType, properties) {
        // Identity segment: Entity identity and versioning
        const identityOp = (state) => ({
            ...state,
            id: state.id + 1
        });
        // Relation segment: Entity relationships and constraints
        const relationOp = (state) => ({
            ...state,
            relation: state.relation + 0.1
        });
        // Geometry segment: Spatial positioning and transformations
        const geometryOp = (state) => {
            const hasPosition = properties.position && typeof properties.position.x === 'number';
            return {
                ...state,
                geometry: state.geometry + (hasPosition ? 0.1 : 0.05)
            };
        };
        // Expression segment: State changes and property updates
        const expressionOp = (state) => ({
            ...state,
            expression: state.expression + 0.2
        });
        // Creation segment: Entity lifecycle and versioning
        const creationOp = (state) => ({
            ...state,
            creation: state.creation + 1
        });
        // Apply manifold evolution for entity creation
        const segments = {
            identity: identityOp,
            relation: relationOp,
            geometry: geometryOp,
            expression: expressionOp,
            collapse: this.defaultCollapse,
            creation: creationOp,
            governance: this.defaultGovernance
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        // Store entity in dimensional state
        this.dimension.drill("entities", entityId).value = {
            type: entityType,
            properties,
            manifoldState: this.currentManifoldState,
            created: Date.now()
        };
        return this.currentManifoldState;
    }
    /**
     * Convert entity update to manifold operations
     */
    convertEntityUpdate(entityId, updates) {
        const entity = this.dimension.drill("entities", entityId).value;
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }
        // Expression segment: State changes and property updates
        const expressionOp = (state) => ({
            ...state,
            expression: state.expression + 0.15
        });
        // Geometry segment: Spatial positioning and transformations (if position changed)
        const geometryOp = (state) => {
            const hasPositionUpdate = updates.position && typeof updates.position.x === 'number';
            return {
                ...state,
                geometry: state.geometry + (hasPositionUpdate ? 0.08 : 0.02)
            };
        };
        // Collapse segment: State reduction and optimization
        const collapseOp = (state) => ({
            ...state,
            collapse: Math.min(1, state.collapse + 0.05)
        });
        // Apply manifold evolution for entity update
        const segments = {
            identity: this.defaultIdentity,
            relation: this.defaultRelation,
            geometry: geometryOp,
            expression: expressionOp,
            collapse: collapseOp,
            creation: this.defaultCreation,
            governance: this.defaultGovernance
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        // Update entity in dimensional state
        const entityData = entity;
        entityData.properties = { ...entityData.properties, ...updates };
        entityData.manifoldState = this.currentManifoldState;
        entityData.lastUpdated = Date.now();
        return this.currentManifoldState;
    }
    /**
     * Convert entity deletion to manifold operations
     */
    convertEntityDeletion(entityId) {
        const entity = this.dimension.drill("entities", entityId).value;
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }
        // Collapse segment: State reduction and optimization
        const collapseOp = (state) => ({
            ...state,
            collapse: Math.min(1, state.collapse + 0.2)
        });
        // Creation segment: Entity lifecycle and versioning
        const creationOp = (state) => ({
            ...state,
            creation: state.creation - 1
        });
        // Apply manifold evolution for entity deletion
        const segments = {
            identity: this.defaultIdentity,
            relation: this.defaultRelation,
            geometry: this.defaultGeometry,
            expression: this.defaultExpression,
            collapse: collapseOp,
            creation: creationOp,
            governance: this.defaultGovernance
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        // Remove entity from dimensional state
        this.dimension.drill("entities", entityId).value = undefined;
        return this.currentManifoldState;
    }
    /**
     * Convert physics simulation to manifold operations
     */
    convertPhysicsSimulation(entities, deltaTime) {
        // Geometry segment: Spatial positioning and transformations
        const geometryOp = (state) => ({
            ...state,
            geometry: state.geometry + 0.15
        });
        // Expression segment: State changes and property updates
        const expressionOp = (state) => ({
            ...state,
            expression: state.expression + 0.25
        });
        // Apply manifold evolution for physics simulation
        const segments = {
            identity: this.defaultIdentity,
            relation: this.defaultRelation,
            geometry: geometryOp,
            expression: expressionOp,
            collapse: this.defaultCollapse,
            creation: this.defaultCreation,
            governance: this.defaultGovernance
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        // Update entity positions in dimensional state
        entities.forEach(entity => {
            const entityData = this.dimension.drill("entities", entity.id).value;
            if (entityData && entityData.properties.position) {
                entityData.properties.position = entity.position;
                entityData.lastUpdated = Date.now();
            }
        });
        return this.currentManifoldState;
    }
    /**
     * Convert rendering operation to manifold operations
     */
    convertRendering(entities, canvas) {
        // Geometry segment: Spatial positioning and transformations
        const geometryOp = (state) => ({
            ...state,
            geometry: state.geometry + 0.1
        });
        // Expression segment: State changes and property updates
        const expressionOp = (state) => ({
            ...state,
            expression: state.expression + 0.1
        });
        // Apply manifold evolution for rendering
        const segments = {
            identity: this.defaultIdentity,
            relation: this.defaultRelation,
            geometry: geometryOp,
            expression: expressionOp,
            collapse: this.defaultCollapse,
            creation: this.defaultCreation,
            governance: this.defaultGovernance
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        return this.currentManifoldState;
    }
    /**
     * Convert AI decision making to manifold operations
     */
    convertDecisionMaking(entityId, context) {
        const entity = this.dimension.drill("entities", entityId).value;
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }
        // Expression segment: State changes and property updates
        const expressionOp = (state) => ({
            ...state,
            expression: state.expression + 0.3
        });
        // Relation segment: Entity relationships and constraints
        const relationOp = (state) => ({
            ...state,
            relation: state.relation + 0.15
        });
        // Apply manifold evolution for decision making
        const segments = {
            identity: this.defaultIdentity,
            relation: relationOp,
            geometry: this.defaultGeometry,
            expression: expressionOp,
            collapse: this.defaultCollapse,
            creation: this.defaultCreation,
            governance: this.defaultGovernance
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        // Store decision context in dimensional state
        const entityData = entity;
        entityData.decisionContext = context;
        entityData.lastDecision = Date.now();
        return this.currentManifoldState;
    }
    /**
     * Convert optimization level change to manifold operations
     */
    convertOptimizationLevel(level) {
        // Governance segment: Rules, constraints, and optimization levels
        const governanceOp = (state) => ({
            ...state,
            governance: Math.min(1, state.governance + (level * 0.1))
        });
        // Collapse segment: State reduction and optimization
        const collapseOp = (state) => ({
            ...state,
            collapse: Math.min(1, state.collapse + (level * 0.05))
        });
        // Apply manifold evolution for optimization
        const segments = {
            identity: this.defaultIdentity,
            relation: this.defaultRelation,
            geometry: this.defaultGeometry,
            expression: this.defaultExpression,
            collapse: collapseOp,
            creation: this.defaultCreation,
            governance: governanceOp
        };
        this.currentManifoldState = (0, _7_segment_state_1.evolveManifold)(this.currentManifoldState, segments);
        return this.currentManifoldState;
    }
    /**
     * Get current manifold state
     */
    getCurrentState() {
        return { ...this.currentManifoldState };
    }
    /**
     * Get entity from dimensional state
     */
    getEntity(entityId) {
        return this.dimension.drill("entities", entityId).value;
    }
    /**
     * Get all entities from dimensional state
     */
    getAllEntities() {
        const entities = this.dimension.drill("entities");
        const result = [];
        // Use the keys() method to iterate over entity IDs
        const entityIds = entities.keys();
        for (const id of entityIds) {
            const entity = entities.at(id).value;
            if (entity && typeof entity === 'object') {
                result.push({
                    id,
                    ...entity
                });
            }
        }
        return result;
    }
    /**
     * Reset manifold state
     */
    resetState(initialState) {
        this.currentManifoldState = (0, _7_segment_state_1.createManifoldState)(initialState);
        this.dimension = new dimensional_1.Dimension({});
    }
}
exports.ManifoldMathConverter = ManifoldMathConverter;
