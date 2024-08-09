import { Block, Vector3, system } from "@minecraft/server";
import CuboidRegion from "../Region/CuboidRegion";
import { AStarOptions } from "./AStarOptions";
import { BlockSafetyCheckerUtility } from "../BlockSafetyChecker/BlockSafetyCheckerUtility";
import { BlockSafetyCheckerOptions } from "../BlockSafetyChecker/BlockSafetyCheckerOptions";
import { BlockSafetyCheckResult } from "../BlockSafetyChecker/BlockSafetyCheckResult";
import { IAStarNode } from "./Interfaces/IAStarNode";
import { ClosedAStarLocations } from "./Types/ClosedAStarLocations";
import { Vector } from "../Vector/Vector";
import { MinecraftBlockTypes} from "../vanilla-types/index";

/**
 * Implementation of the A* algorithm for Minecraft
 */
export class AStar{

    private Options: AStarOptions;
    private StartBlock: Block;
    private EndBlock: Block;
    private TotalDebugBlocksCreated: Set<Block>;


    public constructor(options: AStarOptions){
        this.Options = options;
        this.TotalDebugBlocksCreated = new Set();

        let startBlock: Block | undefined;
        let endBlock: Block | undefined;
        try{
            startBlock = this.Options.Dimension.getBlock(this.Options.StartLocation);
            endBlock = this.Options.Dimension.getBlock(this.Options.GoalLocation);
        }catch(e){}
        
        if (startBlock !== undefined && endBlock !== undefined){
            this.StartBlock = startBlock;
            this.EndBlock = endBlock;
        }else{
            throw "Start and End must point to valid and loaded blocks.";
        }
    }

    /**
     * Initiates A* pathfinding to the GoalLocation provided in the constructor's AStarOptions. Throws an exception if a path cannot be found.
     * @throws
     */
    public async Pathfind(): Promise<Block[]>{
        // Iterate over possible nodes
        // If the iterated node is the goal location, then we're done
        // for
        const goalNode = await new Promise<IAStarNode>(goalNodeResolve => {
            system.runJob(this.IterateUntilGoalBlockReached(goalNodeResolve));
        });

        const blockPath: Block[] = [];
        let currentNode: IAStarNode | null = goalNode;
        while (currentNode !== null){
            blockPath.push(currentNode.Block);
            currentNode = currentNode.ParentNode;
        }
        this.ClearDebugBlocks();
        return blockPath.reverse();
    }

    /**
     * Used in a system.runJob call. Used to iterate over all nodes in an A* pathfinding algorithm. Yields often and returns (finishes) by calling the goalNodePromiseResolve to finish the generator. Throws exceptions if a path cannot be found.
     * @throws
     */
    public *IterateUntilGoalBlockReached(goalNodePromiseResolve: (goalNode: IAStarNode) => void){
        const openList: IAStarNode[] = [ 
            {
                Block: this.StartBlock, 
                ParentNode: null,
                FCost: this.CalculateFCost(this.StartBlock),
                GCost: this.CalculateGCost(this.StartBlock),
                HCost: this.CalculateHHeuristic(this.StartBlock),
            }
        ];

        // Keep track of locations we've closed and won't consider again
        const closedListLocations: ClosedAStarLocations = {};

        // Iterate until the openList is exhausted of all options
        while (openList.length > 0){

            // Check if we have considered too many nodes and the path may be too difficult or impossible to get to
            if (Object.keys(closedListLocations).length >= this.Options.MaximumNodesToConsider){
                this.ClearDebugBlocks();
                throw "Maximum number of nodes considered. MaximumNodesToConsider limit option hit.";
            }

            // Find the next node in the openList with the lowest F cost
            const nextIndex: number = this.GetIndexOfNodeWithLowestFCost(openList);
            const nextNode: IAStarNode = openList[nextIndex];
            const locationHash: string = Vector.toString(nextNode.Block.location);

            // Check if the nextNode is the EndBlock
            if (Vector.equals(nextNode.Block, this.EndBlock)){
                return goalNodePromiseResolve(nextNode);
            }

            // Remove the nextIndex from the open node list
            openList.splice(nextIndex, 1);

            // Add it to closed list locations
            closedListLocations[locationHash] = nextNode;

            // Get all the adjacent locations surrounding the nextNode.Block
            const surroundingLocations: Vector3[] = CuboidRegion.FromCenterLocation(nextNode.Block.location, 1, true).GetAllLocationsInRegion();
            const surroundingBlocks: Block[] = [];

            // Load block safety options
            const safetyCheckOptions = new BlockSafetyCheckerOptions();
            safetyCheckOptions.TagsToConsiderPassable = this.Options.TagsToConsiderPassable;
            safetyCheckOptions.TypeIdsToConsiderPassable = this.Options.TypeIdsToConsiderPassable;
            safetyCheckOptions.TypeIdsThatCannotBeJumpedOver = this.Options.TypeIdsThatCannotBeJumpedOver;
            safetyCheckOptions.AllowYAxisFlood = this.Options.AllowYAxisFlood;

            for (const location of surroundingLocations){
                let blockAtLocation: Block | undefined;
                try{
                    blockAtLocation = this.Options.Dimension.getBlock(location);
                }catch(e){}

                if (blockAtLocation !== undefined && blockAtLocation.isValid()){
                    // Is it the block we're looking for?
                    if (Vector.equals(location, this.Options.GoalLocation)){
                        // Add it regardless of safety
                        surroundingBlocks.push(blockAtLocation);
                    }else{
                        // Check it is safe to move to, fall down from, or jump ontop of
                        const safetyCheckResult: BlockSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(blockAtLocation, safetyCheckOptions);

                        // Adrian - The only thing we need is to make it move anywhere, and just add collision detection.
                        if (safetyCheckResult.IsSafe){
                            if(safetyCheckOptions.AllowYAxisFlood) {
                                surroundingBlocks.push(blockAtLocation);
                                surroundingBlocks.push(<Block>blockAtLocation.below(1));
                                surroundingBlocks.push(<Block>blockAtLocation.above(1));
                            }
                            // Check if it's safe to fall from
                            if (safetyCheckResult.CanSafelyFallFrom){
                                // Use the block below blockAtLocation
                                surroundingBlocks.push(<Block>blockAtLocation.below(1));
                            }else if (safetyCheckResult.CanSafelyJumpOnto){
                                // Use the block above blockAtLocation
                                surroundingBlocks.push(<Block>blockAtLocation.above(1));
                            }else{
                                // The 'blockAtLocation' itself is fine
                                surroundingBlocks.push(blockAtLocation);
                            }
                        }
                    }
                }
                yield;
            }

            // The surroundingBlocks array is now an array of blocks that can be walked to, jumped to, or fallen to - all safely
            for (const surroundingBlock of surroundingBlocks){
                // Build the surrounding node from the surroundingBlock and set the parent as the current nextNode
                const surroundingNode: IAStarNode = {
                    Block: surroundingBlock, 
                    ParentNode: nextNode,
                    FCost: this.CalculateFCost(surroundingBlock),
                    GCost: nextNode.GCost + 1,// this.CalculateGCost(surroundingBlock),
                    HCost: this.CalculateHHeuristic(surroundingBlock),
                };
                const surroundingBlockLocationHash: string = Vector.toString(surroundingBlock.location);

                // Creates a path traces using Structure Void whenever in debug mode
                this.SetDebugBlock(surroundingBlock);

                // Check if this block is the end block
                if (Vector.equals(surroundingBlock, this.EndBlock)){
                    return goalNodePromiseResolve(surroundingNode);
                }

                // Check if the block is in the closed list
                if (surroundingBlockLocationHash in closedListLocations){
                    // Skip this block
                    continue;
                }

                // Check if the block is already in the open list
                const indexOfExistingNodeInOpenList: number | null = this.GetIndexOfNodeIfInList(surroundingNode, openList);
                if (indexOfExistingNodeInOpenList === null){
                    // It is not in the openList, add it to the open list
                    openList.push(surroundingNode);
                }else{
                    // It's already in the openList
                    // Compare the existing openList index node value to the surroundingNode g cost value
                    // If the surroundingNode.gCost is less than the existing openList index node value, then
                    // modify the existing openLiset index node value to have the new gCost and fCost and parent to match surroundingNode's properties
                    if (openList[indexOfExistingNodeInOpenList].GCost > surroundingNode.GCost){
                        openList[indexOfExistingNodeInOpenList].GCost = surroundingNode.GCost;
                        openList[indexOfExistingNodeInOpenList].ParentNode = surroundingNode.ParentNode;
                    }
                }

                yield;
            }
        }

        // Out of options if we get here without returning
        this.ClearDebugBlocks();
        throw "No path could be found to the destination. All adjacent moveable nodes to consider has been exhausted.";
    }

    /**
     * Sets a debug block (structure void) to visualize how the pathfinding traverses considering the passable blocks.
     * @param block The block to put the debug blocks in.
     */
    private SetDebugBlock(block: Block) {
        if(!this.Options.DebugMode) return;
        if(!(Vector.toString(block.location) 
            in 
            [...this.TotalDebugBlocksCreated].map((b: Block)=> Vector.toString(b.location)))
        ) this.TotalDebugBlocksCreated.add(block);
        this.Options.Dimension.setBlockType(block, MinecraftBlockTypes.StructureVoid);
    }

    /**
     * Clears all the placed debug blocks from the pathfinding execution.
     * @returns 
     */
    private ClearDebugBlocks() {
        if(!this.Options.DebugMode) return;
        const locs = this.TotalDebugBlocksCreated;
        const safetyCheckOptions = new BlockSafetyCheckerOptions();
        safetyCheckOptions.TagsToConsiderPassable = this.Options.TagsToConsiderPassable;
        safetyCheckOptions.TypeIdsToConsiderPassable = this.Options.TypeIdsToConsiderPassable;
        safetyCheckOptions.TypeIdsThatCannotBeJumpedOver = this.Options.TypeIdsThatCannotBeJumpedOver;
        safetyCheckOptions.AllowYAxisFlood = this.Options.AllowYAxisFlood;
        for(const v of locs){
            system.run(() => {
                const vx = v.location;
                if(Vector.equals(vx, this.Options.StartLocation) || Vector.equals(vx, this.Options.GoalLocation)) return
                if(!v.matches(MinecraftBlockTypes.StructureVoid)) return;
                this.Options.Dimension.setBlockType(vx, MinecraftBlockTypes.Air);
            });
        }
    }

    /**
     * Checks if a node is present in the provided array of nodes by checking if the provided node's block matches any block locations 
     * in the listOfNodes array.
     * @param listOfBlocks
     * @param block 
     * @returns 
     */
    private GetIndexOfNodeIfInList(node: IAStarNode, listOfNodes: IAStarNode[]): number | null{
        for (const index in listOfNodes){
            const indexNumber: number = parseInt(index);
            const nodeInList: IAStarNode = listOfNodes[indexNumber];
            if (Vector.equals(node.Block, nodeInList.Block)){
                return indexNumber;
            }
        }

        return null;
    }

    /**
     * Gets the index of the block with the lowest calculated F cost from a list of nodes
     * @param listOfNodes 
     * @returns 
     */
    private GetIndexOfNodeWithLowestFCost(listOfNodes: IAStarNode[]): number{
        let currentLowestIndex = -1;
        let currentLowestFCost = -1;

        for (const index in listOfNodes){
            let indexNumber: number = parseInt(index);
            if (currentLowestIndex === -1){
                currentLowestFCost = this.CalculateFCost(listOfNodes[indexNumber].Block);
                currentLowestIndex = indexNumber;
            }else{
                const thisFCost = this.CalculateFCost(listOfNodes[indexNumber].Block);
                if (thisFCost < currentLowestFCost){
                    currentLowestFCost = thisFCost;
                    currentLowestIndex = indexNumber;
                }
            }
        }

        return currentLowestIndex;
    }

    /**
     * Calculates the "F" cost of a node, which is F = G + H
     * @param Block
     */
    private CalculateFCost(block: Block): number{
        return this.CalculateGCost(block) + this.CalculateHHeuristic(block);
    }

    /**
     * Calculates the "G" cost of a node
     * @param block 
     * @returns 
     */
    private CalculateGCost(block: Block): number{
        return Vector.distance(block.location, this.Options.StartLocation);
    }

    /**
     * Calculates the "H" heuristic of a node
     * @param block 
     * @returns 
     */
    private CalculateHHeuristic(block: Block): number{
        return Vector.distance(block.location, this.Options.GoalLocation);
    }
}