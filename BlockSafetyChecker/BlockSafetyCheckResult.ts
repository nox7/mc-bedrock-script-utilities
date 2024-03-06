export class BlockSafetyCheckResult{
    /**
     * The primary result boolean. Use this to determine if you even need to read any of the other properties.
     * If IsSafe is true, then you can use this block in your queries as a safe-to-move-to block.
     */
    public IsSafe: boolean = false;
    /**
     * If IsSafe is true: If the block provided to the safety checker can be safely fallen one block below from.
     */
    public CanSafelyFallFrom: boolean = false;
    /**
     * If IsSafe is true: If the block provided to the safety checker can be safely jumped onto
     */
    public CanSafelyJumpOnto: boolean = false;
    /**
     * If the block provided to the safety checker has air below it and even further below that - a possible cliff drop that we cannot
     * safely jump down from.
     */
    public IsPossibleCliff: boolean = false;
    /**
     * If the block provided is water
     */
    public IsWater: boolean = false;
    /**
     * If the block provided is lava
     */
    public IsLava: boolean = false;
    /**
     * If there is water below the provided block
     */
    public HasWaterBelow: boolean = false;
    /**
     * If there is lava below the provided block
     */
    public HasLavaBelow: boolean = false;
    /**
     * Will be true if IsSafe is false and there isn't enough space above the provided block to walk onto it
     * but the provided block was at least empty/passable.
     */
    public NotEnoughSpaceAboveBlockToWalkTo: boolean = false;
    /**
     * Will be true if IsSafe is false and there isn't enough space above the provided block to jump onto it
     */
    public NotEnoughSpaceAboveBlockToJumpTo: boolean = false;
    /**
     * If IsSafe is false and this is true, then the block was never checked if it could be jumped over simply because
     * it is a block that the provided options told the safety checker it could not be jumped over. This could be a fence
     * or wall block.
     */
    public CannotBeJumpedOver: boolean = false;
    /**
     * If IsSafe is false and AdjacentBlockIsInUnloadedChunk is true, it means the safety check because we can't actually know if the provided
     * block is safe or not - an adjacent block is unloaded and can't be checked for safety.
     */
    public AdjacentBlockIsInUnloadedChunk: boolean = false;
}