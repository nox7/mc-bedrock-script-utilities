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
 * Implementation of the Bidirectional A* algorithm for Minecraft
 */

//! Update it to mc_bedrock_utilities repository.

//! Use Hashmap instead of list, since most of the needed operations are lookup.
export class BidirectionalAStar{

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
        // If the iterated node is the goal location, then we're done.
        const goalNode = await new Promise<IAStarNode[]>(goalNodeResolve => {
            system.runJob(this.IterateUntilGoalBlockReached(goalNodeResolve));
        });

        let currentNode: IAStarNode[] | null = goalNode;
        this.ClearDebugBlocks();

        return currentNode.map(n => n.Block).reverse();
    }

    /**
     * Used in a system.runJob call. Used to iterate over all nodes in an A* pathfinding algorithm. Yields often and returns (finishes) by calling the goalNodePromiseResolve to finish the generator. Throws exceptions if a path cannot be found.
     * @throws
     */
    public *IterateUntilGoalBlockReached(goalNodePromiseResolve: (goalNode: IAStarNode[]) => void) {
        const openList: IAStarNode[] = [ 
            {
                Block: this.StartBlock, 
                ParentNode: null,
                FCost: this.CalculateFCost(this.StartBlock, this.Options.StartLocation, this.Options.GoalLocation),
                GCost: this.CalculateGCost(this.StartBlock, this.Options.StartLocation),
                HCost: this.CalculateHHeuristic(this.StartBlock, this.Options.GoalLocation),
            }
        ];
        
        const reverseOpenList: IAStarNode[] = [ 
            {
                Block: this.EndBlock,
                ParentNode: null,
                FCost: this.CalculateFCost(this.EndBlock, this.Options.GoalLocation, this.Options.StartLocation),
                GCost: this.CalculateGCost(this.EndBlock, this.Options.GoalLocation),
                HCost: this.CalculateHHeuristic(this.EndBlock, this.Options.StartLocation),
            }
        ];
    
        const closedListLocations: ClosedAStarLocations = {};
        const reverseClosedListLocations: ClosedAStarLocations = {};
        let surroundingBlocks: Block[] = [];
        let reverseSurroundingBlocks: Block[] = [];
    
        while (openList.length > 0 && reverseOpenList.length > 0) {
            if (Object.keys(closedListLocations).length >= this.Options.MaximumNodesToConsider ||
                Object.keys(reverseClosedListLocations).length >= this.Options.MaximumNodesToConsider) {
                this.ClearDebugBlocks();
                throw "Maximum number of nodes considered. MaximumNodesToConsider limit option hit.";
            }
    
            const nextIndex: number = this.GetIndexOfNodeWithLowestFCost(openList, this.Options.StartLocation, this.Options.GoalLocation);
            const nextNode: IAStarNode = openList[nextIndex];
            const locationHash: string = Vector.toString(nextNode.Block.location);

            const reverseNextIndex: number = this.GetIndexOfNodeWithLowestFCost(reverseOpenList, this.Options.GoalLocation, this.Options.StartLocation);
            const reverseNextNode: IAStarNode = reverseOpenList[reverseNextIndex];
            const reverseLocationHash: string = Vector.toString(reverseNextNode.Block.location);

            // When the next forward or reversed node is in another A* closed locations such as the forward or the reversed
            if (locationHash in reverseClosedListLocations || reverseLocationHash in closedListLocations) {
                let nodeList: IAStarNode[] = [];
                let currentNode: IAStarNode | null = nextNode;
                while (currentNode !== null) {
                    if(!this.GetIndexOfNodeIfInList(currentNode, nodeList)) nodeList.push(currentNode);
                    currentNode = currentNode.ParentNode;
                    yield;
                }
                nodeList = [nodeList[0], nodeList[nodeList.length - 1]];
                currentNode = reverseNextNode;
                while (currentNode !== null) {
                    if(!this.GetIndexOfNodeIfInList(currentNode, nodeList)) nodeList.push(currentNode);
                    currentNode = currentNode.ParentNode;
                    yield;
                }
                return goalNodePromiseResolve(nodeList);
            }
            
            openList.splice(nextIndex, 1);
            closedListLocations[locationHash] = nextNode;
    
            let surroundingLocations: Vector3[];
            if(!this.Options.AllowYAxisFlood) {
                surroundingLocations = CuboidRegion.FromCenterLocation(nextNode.Block.location, 1, true).GetAllLocationsInRegion();
            } else {
                surroundingLocations = CuboidRegion.GetAdjacentPositions(nextNode.Block.location, 1);
            }
            surroundingBlocks = [];
            
            reverseOpenList.splice(reverseNextIndex, 1);
            reverseClosedListLocations[reverseLocationHash] = reverseNextNode;
            
            let reverseSurroundingLocations: Vector3[];
            if(!this.Options.AllowYAxisFlood) {
                reverseSurroundingLocations = CuboidRegion.FromCenterLocation(reverseNextNode.Block.location, 1, true).GetAllLocationsInRegion();
            } else {
                reverseSurroundingLocations = CuboidRegion.GetAdjacentPositions(reverseNextNode.Block.location, 1);
            }
            reverseSurroundingBlocks = [];
    
            const safetyCheckOptions = new BlockSafetyCheckerOptions();
            safetyCheckOptions.TagsToConsiderPassable = this.Options.TagsToConsiderPassable;
            safetyCheckOptions.TypeIdsToConsiderPassable = this.Options.TypeIdsToConsiderPassable;
            safetyCheckOptions.TypeIdsThatCannotBeJumpedOver = this.Options.TypeIdsThatCannotBeJumpedOver;
            safetyCheckOptions.AllowYAxisFlood = this.Options.AllowYAxisFlood;
    
            for (const location of surroundingLocations) {
                let blockAtLocation: Block | undefined;
                try {
                    blockAtLocation = this.Options.Dimension.getBlock(location);
                } catch(e) {}
    
                if (blockAtLocation !== undefined && blockAtLocation.isValid()) {
                    if (Vector.equals(location, this.Options.GoalLocation)) {
                        surroundingBlocks.push(blockAtLocation);
                        break;
                    } else {
                        const safetyCheckResult: BlockSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(blockAtLocation, safetyCheckOptions);
    
                        if (safetyCheckResult.IsSafe) {
                            if(safetyCheckOptions.AllowYAxisFlood) {
                                const belowBlock = blockAtLocation.below();
                                const upBlock = blockAtLocation.above();
                                const bottomSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(belowBlock!, safetyCheckOptions);
                                const topSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(upBlock!, safetyCheckOptions);
                                if(bottomSafetyCheckResult.IsSafe) surroundingBlocks.push(belowBlock!);
                                if(topSafetyCheckResult.IsSafe) surroundingBlocks.push(upBlock!);
                                surroundingBlocks.push(blockAtLocation);
                                continue;
                            }
                            if (safetyCheckResult.CanSafelyFallFrom) {
                                surroundingBlocks.push(<Block>blockAtLocation.below(1));
                            } else if (safetyCheckResult.CanSafelyJumpOnto) {
                                surroundingBlocks.push(<Block>blockAtLocation.above(1));
                            } else {
                                surroundingBlocks.push(blockAtLocation);
                            }
                        }
                    }
                }
                yield;
            }
    
            for (const surroundingBlock of surroundingBlocks) {
                const surroundingNode: IAStarNode = {
                    Block: surroundingBlock,
                    ParentNode: nextNode,
                    FCost: this.CalculateFCost(surroundingBlock, this.Options.StartLocation, this.Options.GoalLocation),
                    GCost: nextNode.GCost + 1,
                    HCost: this.CalculateHHeuristic(surroundingBlock, this.Options.GoalLocation),
                };
                const surroundingBlockLocationHash: string = Vector.toString(surroundingBlock.location);
                
                if (surroundingBlockLocationHash in closedListLocations) {
                    continue;
                }

                const IndexOfExistingNodeInReversedOpenList = this.GetIndexOfNodeIfInList(surroundingNode, reverseOpenList);
                if(IndexOfExistingNodeInReversedOpenList){
                    const forwardSurroundingNode = surroundingNode;
                    let nodeList: IAStarNode[] = [];
                    let currentNode: IAStarNode | null = forwardSurroundingNode;
                    while (currentNode !== null) {
                        if(!this.GetIndexOfNodeIfInList(currentNode, nodeList)) nodeList.push(currentNode);
                        currentNode = currentNode.ParentNode;
                        yield;
                    }
                    nodeList = nodeList.reverse();
                    currentNode = reverseOpenList[IndexOfExistingNodeInReversedOpenList];
                    while (currentNode !== null) {
                        if(!this.GetIndexOfNodeIfInList(currentNode, nodeList)) nodeList.push(currentNode);
                        currentNode = currentNode.ParentNode;
                        yield;
                    }
                    nodeList = nodeList.reverse();
                    return goalNodePromiseResolve(nodeList);
                }
    
                this.SetDebugBlock(surroundingBlock);

                const indexOfExistingNodeInOpenList: number | null = this.GetIndexOfNodeIfInList(surroundingNode, openList);
                if (indexOfExistingNodeInOpenList === null) {
                    openList.push(surroundingNode);
                } else {
                    if (openList[indexOfExistingNodeInOpenList].GCost > surroundingNode.GCost) {
                        openList[indexOfExistingNodeInOpenList].GCost = surroundingNode.GCost;
                        openList[indexOfExistingNodeInOpenList].ParentNode = surroundingNode.ParentNode;
                    }
                }
    
                yield;
            }
    
            for (const location of reverseSurroundingLocations) {
                let blockAtLocation: Block | undefined;
                try {
                    blockAtLocation = this.Options.Dimension.getBlock(location);
                } catch(e) {}
    
                if (blockAtLocation !== undefined && blockAtLocation.isValid()) {
                    if (Vector.equals(location, this.Options.StartLocation)) {
                        reverseSurroundingBlocks.push(blockAtLocation);
                        break;
                    } else {
                        const safetyCheckResult: BlockSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(blockAtLocation, safetyCheckOptions);
    
                        if (safetyCheckResult.IsSafe) {
                            if(safetyCheckOptions.AllowYAxisFlood) {
                                const belowBlock = blockAtLocation.below();
                                const upBlock = blockAtLocation.above();
                                const bottomSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(belowBlock!, safetyCheckOptions);
                                const topSafetyCheckResult = BlockSafetyCheckerUtility.RunBlockSafetyCheck(upBlock!, safetyCheckOptions);
                                if(bottomSafetyCheckResult.IsSafe) reverseSurroundingBlocks.push(belowBlock!);
                                if(topSafetyCheckResult.IsSafe) reverseSurroundingBlocks.push(upBlock!);
                                reverseSurroundingBlocks.push(blockAtLocation);
                                continue;
                            }
                            if (safetyCheckResult.CanSafelyFallFrom) {
                                reverseSurroundingBlocks.push(<Block>blockAtLocation.below(1));
                            } else if (safetyCheckResult.CanSafelyJumpOnto) {
                                reverseSurroundingBlocks.push(<Block>blockAtLocation.above(1));
                            } else {
                                reverseSurroundingBlocks.push(blockAtLocation);
                            }
                        }
                    }
                }
                yield;
            }
    
            for (const reverseSurroundingBlock of reverseSurroundingBlocks) {
                const reverseSurroundingNode: IAStarNode = {
                    Block: reverseSurroundingBlock,
                    ParentNode: reverseNextNode,
                    FCost: this.CalculateFCost(reverseSurroundingBlock, this.Options.GoalLocation, this.Options.StartLocation),
                    GCost: reverseNextNode.GCost + 1,
                    HCost: this.CalculateHHeuristic(reverseSurroundingBlock, this.Options.StartLocation),
                };
                const reverseSurroundingBlockLocationHash: string = Vector.toString(reverseSurroundingBlock.location);
                
                if (reverseSurroundingBlockLocationHash in reverseClosedListLocations) {
                    continue;
                }

                const reversedIndexOfExistingNodeInOpenList = this.GetIndexOfNodeIfInList(reverseSurroundingNode, openList);
                if(reversedIndexOfExistingNodeInOpenList){
                    const forwardSurroundingNode = openList[reversedIndexOfExistingNodeInOpenList];
                    let nodeList: IAStarNode[] = [];
                    let currentNode: IAStarNode | null = forwardSurroundingNode;
                    while (currentNode !== null) {
                        if(!this.GetIndexOfNodeIfInList(currentNode, nodeList)) nodeList.push(currentNode);
                        currentNode = currentNode.ParentNode;
                        yield;
                    }
                    nodeList = nodeList.reverse();
                    currentNode = reverseSurroundingNode;
                    while (currentNode !== null) {
                        if(!this.GetIndexOfNodeIfInList(currentNode, nodeList)) nodeList.push(currentNode);
                        currentNode = currentNode.ParentNode;
                        yield;
                    }
                    nodeList = nodeList.reverse();
                    return goalNodePromiseResolve(nodeList);
                }

                this.SetDebugBlock(reverseSurroundingBlock);
    
                const reverseIndexOfExistingNodeInReversedOpenList: number | null = this.GetIndexOfNodeIfInList(reverseSurroundingNode, reverseOpenList);
                if (reverseIndexOfExistingNodeInReversedOpenList === null) {
                    reverseOpenList.push(reverseSurroundingNode);
                } else {
                    if (reverseOpenList[reverseIndexOfExistingNodeInReversedOpenList].GCost > reverseSurroundingNode.GCost) {
                        reverseOpenList[reverseIndexOfExistingNodeInReversedOpenList].GCost = reverseSurroundingNode.GCost;
                        reverseOpenList[reverseIndexOfExistingNodeInReversedOpenList].ParentNode = reverseSurroundingNode.ParentNode;
                    }
                }
                yield;
            }
        }
        this.ClearDebugBlocks();
        throw "No path could be found to the destination. All adjacent moveable nodes to consider has been exhausted.";
    }

    /**
     * Sets a debug block (structure void) to visualize how the pathfinding traverses considering the passable blocks.
     * @param block The block to put the debug blocks in.
     */
    private SetDebugBlock(block: Block) {
        if (!this.Options.DebugMode) return;
        if(!(Vector.toString(block.location) 
            in 
            [...this.TotalDebugBlocksCreated].map((b: Block)=> Vector.toString(b.location)))
        ) this.TotalDebugBlocksCreated.add(block);
        system.run(() => this.Options.Dimension.setBlockType(block, MinecraftBlockTypes.StructureVoid));
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
     * @param StartLocation Starting location of Node
     * @param GoalLocation End location of Node
     * @returns 
     */
    private GetIndexOfNodeWithLowestFCost(listOfNodes: IAStarNode[], StartLocation: Vector3, GoalLocation: Vector3): number{
        let currentLowestIndex = -1;
        let currentLowestFCost = -1;

        for (const index in listOfNodes){
            let indexNumber: number = parseInt(index);
            if (currentLowestIndex === -1){
                currentLowestFCost = this.CalculateFCost(listOfNodes[indexNumber].Block, StartLocation, GoalLocation);
                currentLowestIndex = indexNumber;
            }else{
                const thisFCost = this.CalculateFCost(listOfNodes[indexNumber].Block, StartLocation, GoalLocation);
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
     * @param block 
     * @param StartLocation Starting location of Node
     * @param GoalLocation End location of Node
     * @returns 
     */
    private CalculateFCost(block: Block, StartLocation: Vector3, GoalLocation: Vector3): number{
        return this.CalculateGCost(block, StartLocation) + this.CalculateHHeuristic(block, GoalLocation);
    }

    /**
     * Calculates the "G" cost of a node
     * @param block 
     * @param StartLocation Starting Location
     * @returns 
     */
    private CalculateGCost(block: Block, StartLocation: Vector3): number{
        return Vector.distance(block.location, StartLocation);
    }

    /**
     * Calculates the "H" heuristic of a node
     * @param block 
     * @returns 
     */
    private CalculateHHeuristic(block: Block, GoalLocation: Vector3): number{
        return Vector.distance(block.location, GoalLocation);
    }
}