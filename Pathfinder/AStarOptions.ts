import { Dimension, Vector3 } from "@minecraft/server";

/**
 * Options to provide to the AStar pathfinding operation to customize its approach to nodes and calculating a path.
 */
export class AStarOptions{
    /**
     * The starting location to pathfind from.
     */
    public StartLocation: Vector3;
    /**
     * The goal location to pathfind to.
     */
    public GoalLocation: Vector3;
    public Dimension: Dimension;
    /**
     * Any locations in this list will be ignored unconditionally - they will never be attempted to even be checked.
     */
    public LocationsToIgnore: Vector3[] = [];
    /**
     * The maximum nodes the A* pathfinder should have in its closed list before a path is considered not calculatable.
     */
    public MaximumNodesToConsider: number = 100;
    /**
     * Tags that should never be considered by the pathdinder.
     */
    public TagsToIgnore: string[] = [];
    /**
     * Type Ids that should never be considered by the pathdinder.
     */
    public TypeIdsToIgnore: string[] = [];
    /**
     * Any tags to consider passable. Such as flowers, grass, etc.
     */
    public TagsToConsiderPassable: string[] = [];
    /**
     * Usually just minecraft:air
     */
    public TypeIdsToConsiderPassable: string[] = [];
    /**
     * A list of block type Ids that the pathfinder should not consider as able to be jumped over.
     */
    public TypeIdsThatCannotBeJumpedOver: string[] = [];
    /**
     * Allows the pathfinding to climb up or down on the Y axis without the algorithm to determine if 
     * it is a safe fall or a reasonable jump for an entity.
     */
    public AllowYAxisFlood: boolean = false;
    /**
     * Mode for debugging using Structure Void Blocks to visualize how the pathfinding traverses.
     */
    public DebugMode: boolean = false;

    public constructor(startLocation: Vector3, goalLocation: Vector3, dimension: Dimension){
        this.StartLocation = startLocation;
        this.GoalLocation = goalLocation;
        this.Dimension = dimension;
    }

    
}