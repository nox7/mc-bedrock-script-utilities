import { Dimension, Vector3 } from "@minecraft/server";

export class FloodFillIteratorOptions{
    public StartLocation: Vector3;
    public Dimension: Dimension;
    public MaxDistance: number;
    public LocationsToIgnore: Vector3[] = [];
    /**
     * Tags that should never be considered by the iterator.
     */
    public TagsToIgnore: string[] = [];
    /**
     * Type Ids that should never be considered by the iterator.
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
     * Block Type Ids to always include in a flood fill result - regardless if it is passable. This is used
     * in the BlockFinder to make sure the block we are looking for is always included.
     */
    public TypeIdsToAlwaysIncludeInResult: string[] = [];
    /**
     * Same as TypeIdsToAlwaysIncludeInResult, but for tag matches
     */
    public TagsToAlwaysIncludeInResult: string[] = [];
    /**
     * Type Ids that the flood fill iterator should not allow itself to try and jump over.
     */
    public TypeIdsThatCannotBeJumpedOver: string[] = [];
    /**
     * Allows the Flood-Fill iterator to climb up or down on the Y axis without the algorithm to determine if 
     * it is a safe fall or a reasonable jump for an entity.
     */
    public AllowYAxisFlood: boolean = false;

    public constructor(startLocation: Vector3, dimension: Dimension, maxDistance: number){
        this.StartLocation = startLocation;
        this.Dimension = dimension;
        this.MaxDistance = maxDistance;
    }
}