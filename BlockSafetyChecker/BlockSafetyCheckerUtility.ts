import { Block } from "@minecraft/server";
import { BlockSafetyCheckerOptions } from "./BlockSafetyCheckerOptions";
import { BlockSafetyCheckResult } from "./BlockSafetyCheckResult";

/**
 * A set of independent utilies that can check if a block is safe for movement
 */
export class BlockSafetyCheckerUtility{
    /**
     * Runs a safety check on the block provided. Will give an object back that has information about the safety of the block provided.
     * Check the provided returns IsSafe property for general "yes/no" safety answer. Other properties have more information about
     * why IsSafe returned false if it did.
     * @param block 
     */
    public static RunBlockSafetyCheck(block: Block, options: BlockSafetyCheckerOptions): BlockSafetyCheckResult{
        // The block should have been checked for isValid() before calling this
        // We will assume it is valid
        if (BlockSafetyCheckerUtility.IsPassable(block, options)){
            // block is passable. Is it safe below it?
            let blockBelow: Block | undefined;
            try{
                blockBelow = block.below(1);
            }catch(e){}
            if (blockBelow !== undefined){
                if(options.AllowYAxisFlood) {
                    const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                    result.IsSafe = true;
                    return result;
                }
                if (BlockSafetyCheckerUtility.IsPassable(blockBelow, options)){
                    // Check the block even further below
                    let blockFurtherBelow: Block | undefined;
                    try{
                        blockFurtherBelow = block.below(2);
                    }catch(e){}
                    if (blockFurtherBelow !== undefined){
                        if (BlockSafetyCheckerUtility.IsPassable(blockFurtherBelow, options)){
                            // This is a possible cliff. It is not safe to go to
                            const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                            result.IsSafe = false;
                            result.IsPossibleCliff = true;
                            return result;
                        }else{
                            const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                            // Verify we won't fall into lava
                            if (BlockSafetyCheckerUtility.IsLava(blockFurtherBelow, options)){
                                result.IsSafe = false;
                                result.HasLavaBelow = true;
                                return result;
                            }

                            if (BlockSafetyCheckerUtility.IsWater(blockFurtherBelow, options)){
                                result.IsSafe = false;
                                result.HasWaterBelow = false;
                                return result;
                            }

                            // Else, we can _probably_ jump down to it
                            result.IsSafe = true;
                            result.CanSafelyFallFrom = true;
                            return result;
                        }
                    }else{
                        // Undefined
                        // Block is unsafe
                        const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                        result.IsSafe = false;
                        result.AdjacentBlockIsInUnloadedChunk = true;
                        return result;
                    }
                }else{
                    // Check if it's lava or water
                    // If it's not, then 'block' has something solid and walkable below it and 'block' is safe
                    const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();

                    // Is it lava or water?
                    if (BlockSafetyCheckerUtility.IsLava(blockBelow, options)){
                        // Cannot go to block. It has lava below it
                        result.IsSafe = false;
                        result.HasLavaBelow = true;
                        return result;
                    }

                    if (BlockSafetyCheckerUtility.IsWater(blockBelow, options)){
                        result.IsSafe = false;
                        result.HasWaterBelow = false;
                        return result;
                    }

                    // Most likely solid ground of sorts. So that means 'block' has solid ground beneath it and can be walked to
                    // However - now we must make sure that there is at least options.EntityHeight - 1 free spaces above 'block'
                    // so that the walkable entity could fit here
                    for (let i = 0; i < options.EntityHeight - 1; i++){
                        let blockToCheck: Block | undefined;
                        try{
                            blockToCheck = block.above(i + 1);
                        }catch(e){}
                        if (blockToCheck !== undefined){
                            // We only care if it is _not_ passable
                            if (!BlockSafetyCheckerUtility.IsPassable(blockToCheck, options)){
                                // Not passable?
                                // This means there are obstructions above the 'block' variable provided
                                // that would prevent a possible entity with options.EntityHeight from walking 
                                // onto 'block'
                                const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                                result.IsSafe = false;
                                result.NotEnoughSpaceAboveBlockToWalkTo = true;
                                return result;
                            }
                        }else{
                            // Undefined
                            // Block is unsafe
                            result.IsSafe = false;
                            result.AdjacentBlockIsInUnloadedChunk = true;
                            return result;
                        }
                    }

                    // We got here - so all checks have passed and 'block' is safe to move to with no stipulations
                    result.IsSafe = true;
                    return result;
                }
            }else{
                // Undefined
                // Block is unsafe
                const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                result.IsSafe = false;
                result.AdjacentBlockIsInUnloadedChunk = true;
                return result;
            }
        }else{
            // 'block' is not passable
            // Let's check if we can safely jump up to it
            // while also considering the options.EntityHeight value - which determines how much vertical space we need to consider height wise

            if (!BlockSafetyCheckerUtility.CanBeJumpedOver(block, options)){
                // It can never be jumped over
                const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                result.IsSafe = false;
                result.CannotBeJumpedOver = true;
                return result;
            }

            // Recursively check the above blocks
            for (let i = 0; i < options.EntityHeight; i++){
                let blockToCheck: Block | undefined;
                try{
                    blockToCheck = block.above(i + 1);
                }catch(e){}

                if (blockToCheck !== undefined){
                    // Only care if the block isn't passable
                    if (!BlockSafetyCheckerUtility.IsPassable(blockToCheck, options)){
                        // Not passable?
                        const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                        result.IsSafe = false;
                        result.NotEnoughSpaceAboveBlockToJumpTo = true;
                        return result;
                    }
                }else{
                    // Undefined
                    // Block is unsafe
                    const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
                    result.IsSafe = false;
                    result.AdjacentBlockIsInUnloadedChunk = true;
                    return result;
                }
            }

            // If the loop did not return inside of it, then when we get here that means the 'block' provided
            // can be jumped onto
            const result: BlockSafetyCheckResult = new BlockSafetyCheckResult();
            result.IsSafe = true;
            result.CanSafelyJumpOnto = true;
            return result;
        }
    }

    /**
     * Checks if the block is considered passable given the provided safety check options
     * @param block 
     */
    private static IsPassable(block: Block, options: BlockSafetyCheckerOptions): boolean{

        if (!block.isValid()){
            return false;
        }

        if (options.TypeIdsToConsiderPassable !== undefined && options.TypeIdsToConsiderPassable.indexOf(block.typeId) > -1){
            return true;
        }

        if (options.TagsToConsiderPassable !== undefined){
            const blockTags: string[] = block.getTags();
            const tagIdFound: boolean = options.TagsToConsiderPassable.some(tagId => blockTags.indexOf(tagId) > -1);
            if (tagIdFound){
                return true;
            }
        }

        return false;
    }

    /**
     * Checks if the provided block is on the list of blocks that cannot ever be jumped over.
     * @param block
     * @param options 
     */
    private static CanBeJumpedOver(block: Block, options: BlockSafetyCheckerOptions): boolean{
        if (options.TypeIdsThatCannotBeJumpedOver !== undefined && options.TypeIdsThatCannotBeJumpedOver.indexOf(block.typeId) > -1){
            return false;
        }

        if (options.TagIdsThatCannotBeJumpedOver !== undefined){
            const blockTags: string[] = block.getTags();
            const tagIdFound: boolean = options.TagIdsThatCannotBeJumpedOver.some(tagId => blockTags.indexOf(tagId) > -1);
            if (tagIdFound){
                return false;
            }
        }

        return true;
    }

    /**
     * Checks if a provided block is lava
     * @param block 
     */
    private static IsLava(block: Block, options: BlockSafetyCheckerOptions): boolean{
        return block.typeId === "minecraft:lava" && !options.TypeIdsToConsiderPassable.includes(block.typeId);
    }

    /**
     * Checks if a provided block is water
     * @param block 
     */
    private static IsWater(block: Block, options: BlockSafetyCheckerOptions): boolean{
        return block.typeId === "minecraft:water" && !options.TypeIdsToConsiderPassable.includes(block.typeId);
    }
}