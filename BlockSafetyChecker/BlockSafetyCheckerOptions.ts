export class BlockSafetyCheckerOptions{
    /**
     * The height of the entity that might possibly be walking the path that this block safety checker is using.
     * By default, we will assume 2 blocks high - the normal height of most Minecraft humanoid mobs. This is
     * used to check if an entity can properly stand on a block (needs two blocks of height above it).
     */
    public EntityHeight: number = 2;
    /**
     * A list of type Ids to consider passable/walk-through-able. Usually "minecraft:air", grass, flowers, etc.
     */
    public TypeIdsToConsiderPassable: string[] = [];
    /**
     * A list of tags to consider passable/walk-through-able.
     */
    public TagsToConsiderPassable: string[] = [];
    /**
     * A list of type Ids that can never be jumped over
     */
    public TypeIdsThatCannotBeJumpedOver: string[] = [];
    /**
     * A list of tags that can never be jumped over
     */
    public TagIdsThatCannotBeJumpedOver: string[] = [];
}