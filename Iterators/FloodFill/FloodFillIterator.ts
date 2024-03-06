import { Block, Vector, Vector3 } from "@minecraft/server"
import { Queue } from "../../DataStructures/Queue.js";
import { VectorUtils } from "../../Vector/VectorUtils.js";
import { FloodFillIteratorOptions } from "./FloodFillIIteratorOptions.js";
import { BlockSafetyCheckerUtility } from "../../BlockSafetyChecker/BlockSafetyCheckerUtility.js";
import { BlockSafetyCheckerOptions } from "../../BlockSafetyChecker/BlockSafetyCheckerOptions.js";

/**
 * Flood-fill style BFS iterator that will iterate over "passable" blocks starting at a center location. It will also iterate over any blocks
 * included in the list of BlockNamesToInclude. "Empty" blocks (defined by BlockNameToConsiderEmpty) are used to determine if an entity can
 * move to them.
 * 
 * Will return sets of blocks in maximum size of YieldedChunkSize. 
 * 
 * This iterator does not iterate up or down on the Y axis _unless_ the entity needs to jump up a block or jump down a block safely.
 */
export default class FloodFillIterator {

    private Queue: Queue<Block> = new Queue<Block>();
    private Options: FloodFillIteratorOptions;
    private YieldedChunkSize: number = 8;
    private BlockSafetyCheckOptions: BlockSafetyCheckerOptions;

    /**
     * List of hashed locations (comma separated) that have already been considered/visited
     */
    private ClosedList: {[key: string]: boolean} = {};

    public constructor (options: FloodFillIteratorOptions) {
        this.Options = options;

        // Try to get the starting block
        let startingBlock: Block | undefined;
        try{
            startingBlock = options.Dimension.getBlock(options.StartLocation);
        }catch(e){
            throw "Could not use starting block. It is invalid.";
        }

        if (startingBlock === undefined){
            throw "Could not use starting block. It is undefined.";
        }

        // Start by adding the LocationsToIgnore to the ClosedList
        for (const location of this.Options.LocationsToIgnore){
            this.AddLocationToClosedList(location);
        }

        // Set up default block safety check options
        const safetyCheckOptions = new BlockSafetyCheckerOptions();
        safetyCheckOptions.TagsToConsiderPassable = this.Options.TagsToConsiderPassable;
        safetyCheckOptions.TypeIdsToConsiderPassable = this.Options.TypeIdsToConsiderPassable;
        safetyCheckOptions.TypeIdsThatCannotBeJumpedOver = this.Options.TypeIdsThatCannotBeJumpedOver;

        // By default, let's tell it fences and walls cannot be jumped over

        this.BlockSafetyCheckOptions = safetyCheckOptions;

        // Enqueue the first blocks
        for (const block of this.IterateAdjacentPassableBlocks(startingBlock)){
            if (block !== null){
                this.Queue.Enqueue(block);
            }
        }
    }

    /**
     * Determines if the provided block has already been added to this iterator's "closed" list of already-visited blocks.
     * @param block 
     * @returns 
     */
    private HasBlockLocationBeenClosed(block: Block): boolean{
        return VectorUtils.GetAsString(block.location) in this.ClosedList;
    }

    /**
     * Determines if the provided location has already been added to this iterator's "closed" list of already-visited blocks.
     * @param block 
     * @returns 
     */
    private HasLocationBeenClosed(location: Vector3): boolean{
        return VectorUtils.GetAsString(location) in this.ClosedList;
    }

    /**
     * Adds the Vector3 location, after fetching a hash for its Vector3 location, to this iterator's closed list
     * @param block 
     * @returns 
     */
    private AddLocationToClosedList(location: Vector3): void{
        this.ClosedList[VectorUtils.GetAsString(location)] = true;
    }

    /**
     * Checks if the provided block has any notion that the Options have ignored it
     * @param blockPermutation
     * @returns 
     */
    private IsBlockIgnored(block: Block): boolean {
        if (block.isValid()){
            // Check if the block has a tag that is ignored
            if (this.Options.TagsToIgnore.length > 0){
                const anyTagIsIgnored = block.getTags().some(tag => this.Options.TagsToIgnore.indexOf(tag) > -1);
                if (anyTagIsIgnored){
                    return true;
                }
            }

            // Check if the block's typeId is ignored
            if (this.Options.TypeIdsToIgnore.indexOf(block.typeId) > -1){
                return true;
            }

            // No need to check if the location is ignored,
            // as all ignored locations are added to the ClosedList when this iterator is instantiated
        }

        return false;
    }

    /**
     * Returns if the provided block is passable.
     * @param block 
     * @returns 
     */
    private IsBlockPassable(block: Block): boolean{
        if (block.isValid()){
            // Check if the block's typeId is passable
            if (this.Options.TypeIdsToConsiderPassable.indexOf(block.typeId) > -1){
                return true;
            }

            // Check if the block has any tags that are passable
            if (this.Options.TagsToConsiderPassable.length > 0){
                const blockTags: string[] = block.getTags();
                const anyTagsArePassable: boolean = this.Options.TagsToConsiderPassable.some(tag => blockTags.indexOf(tag) > -1);
                if (anyTagsArePassable){
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Returns if the provided block has been defined to always be included in a result set regardless if it is passable.
     * @param block 
     * @returns 
     */
    private IsBlockAlwaysIncluded(block: Block): boolean{
        if (block.isValid()){
            // Check if the block's typeId is included
            if (this.Options.TypeIdsToAlwaysIncludeInResult.indexOf(block.typeId) > -1){
                return true;
            }

            // Check if the block has any tags that are included
            if (this.Options.TagsToAlwaysIncludeInResult.length > 0){
                const blockTags: string[] = block.getTags();
                const anyTagsAreIncluded: boolean = this.Options.TagsToAlwaysIncludeInResult.some(tag => blockTags.indexOf(tag) > -1);
                if (anyTagsAreIncluded){
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Checks if the provided location is further than the MaxDistanceFromCenter would allow
     * @param location
     */
    private IsLocationOutOfBounds(location: Vector3): boolean{
        return Vector.distance(location, this.Options.StartLocation) > this.Options.MaxDistance;
    }

    /**
     * Returns the provided block if it is considered passable. This does _not_ check for upper or lower passable blocks as alternative routes.
     * This function is intended to be used when Options.AllowYAxisFloodFill is true
     * @param block
     */
    private GetBlockIfPassable(block: Block): Block | null{
        if (block.isValid()){
            if (this.IsBlockPassable(block)){
                if (!this.HasBlockLocationBeenClosed(block)){
                    return block;
                }
            }
        }

        return null;
    }

    /**
     * Sets the yielded chunk size, which is the maximum number of blocks to return on one iteration
     * @param size
     */
    public SetYieldedChunkSize(size: number): void{
        this.YieldedChunkSize = size;
    }

    /**
     * Iterates over all adjacent, passable blocks that are adjacent to fromBlock. Only passable blocks will be returned. When AllowYAxisFlood is false,
     * the adjacent block could be a "jump" up from the current fromBlock Y axis - or a jump down. Both would only happen if it is safe and the block could be
     * jumped onto or fallen safely from.
     */
    public *IterateAdjacentPassableBlocks(fromBlock: Block){
        const fromBlockLocation: Vector3 = fromBlock.location;
        const adjacentPositions: Vector3[] = [
            {x: fromBlockLocation.x + 1, y: fromBlockLocation.y, z: fromBlockLocation.z},
            {x: fromBlockLocation.x + 1, y: fromBlockLocation.y, z: fromBlockLocation.z + 1},
            {x: fromBlockLocation.x + 1, y: fromBlockLocation.y, z: fromBlockLocation.z - 1},
            {x: fromBlockLocation.x, y: fromBlockLocation.y, z: fromBlockLocation.z + 1},
            {x: fromBlockLocation.x, y: fromBlockLocation.y, z: fromBlockLocation.z - 2},
            {x: fromBlockLocation.x - 1, y: fromBlockLocation.y, z: fromBlockLocation.z},
            {x: fromBlockLocation.x - 1, y: fromBlockLocation.y, z: fromBlockLocation.z + 1},
            {x: fromBlockLocation.x - 1, y: fromBlockLocation.y, z: fromBlockLocation.z - 1},
        ];

        // Has it been specified that we should move along the Y axis as well?
        if (this.Options.AllowYAxisFlood){
            adjacentPositions.push({x: fromBlockLocation.x, y: fromBlockLocation.y + 1, z: fromBlockLocation.z});
            
            const newPositionsToAdd: Vector3[] = [];
            for (const position of adjacentPositions){
                // Add 2 more positions for + 1 on the Y and - 1 on the Y
                newPositionsToAdd.push(Vector.add(position, {x: 0, y: 1, z: 0}));
                newPositionsToAdd.push(Vector.add(position, {x: 0, y: -1, z: 0}));
            }

            adjacentPositions.push(...newPositionsToAdd);
        }

        for (const location of adjacentPositions){

            // If this location is too far, then skip it
            if (this.IsLocationOutOfBounds(location)){
                continue;
            }

            // Do not check or include locations already closed
            if (this.HasLocationBeenClosed(location)){
                continue;
            }

            let block: Block | undefined;
            try{
                block = this.Options.Dimension.getBlock(location);
            }catch(e){}
            
            if (block !== undefined){
                if (block.isValid()){

                    // Do not consider ignored blocks
                    if (this.IsBlockIgnored(block)){
                        // Add it to the closed list
                        this.AddLocationToClosedList(location);
                        continue;
                    }

                    // Check if this block is always included
                    if (this.IsBlockAlwaysIncluded(block)){
                        this.AddLocationToClosedList(block.location);
                        yield block;
                    }else{
                        // It's not always included, so
                        // get the nearest air block (vertically). It may be itself
                        let availableBlock: Block | null = null;
                        if (this.Options.AllowYAxisFlood){
                            // Simply check the provided block - no adjacent alternatives
                            availableBlock = this.GetBlockIfPassable(block);
                        }else{
                            // Water-like flood fill. Check for safe-fallable blocks or jump-overable blocks 
                            const blockSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(block, this.BlockSafetyCheckOptions);
                            if (blockSafetyCheckResult.IsSafe){
                                if (blockSafetyCheckResult.CanSafelyFallFrom){
                                    const blockBelow = <Block>block.below(1);
                                    if (!this.HasBlockLocationBeenClosed(blockBelow)){
                                        availableBlock = blockBelow;
                                    }
                                }else if (blockSafetyCheckResult.CanSafelyJumpOnto){
                                    const blockAbove = <Block>block.above(1);
                                    if (!this.HasBlockLocationBeenClosed(blockAbove)){
                                        availableBlock = <Block>block.above(1);
                                    }
                                }else{
                                    availableBlock = block;
                                }
                            }
                        }
                        
                        if (availableBlock !== null){
                            this.AddLocationToClosedList(availableBlock.location);
                            yield availableBlock;
                        }else{
                            yield null;
                        }
                    }
                }else{
                    yield null;
                }
            }else{
                yield null;
            }
        }
    }
  
    /**
     * Gets the next location in iteration
     */
    public *IterateLocations() {
        while(!this.Queue.IsEmpty){
            const blocks: Block[] = this.Queue.DequeueChunk(this.YieldedChunkSize);

            // Artificial wait
            if (Math.random() < 0.75){
                yield null;
            }
            
            // Queue up more
            for (const block of blocks){
                if (block.isValid()){
                    const adjacentBlocks: Block[] = [];
                    for (const iteratedBlock of this.IterateAdjacentPassableBlocks(block)){
                        if (iteratedBlock !== null){
                            adjacentBlocks.push(iteratedBlock);
                        }
                        yield null;
                    }

                    this.Queue.EnqueueList(adjacentBlocks);
                    yield block;
                }else{
                    yield null;
                }
            }

            yield null;
        }
    }
}