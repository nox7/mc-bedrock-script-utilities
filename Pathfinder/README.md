# Pathfinder - Implemented with A*
In order to have efficient and customizable pathfinding, I've implemented the A* algorithm in Minecraft with TypeScript. It is efficient by yielding often as a generator function and utilizing system.runJob() to allow the MC engine to determine how fast the algorithm can be based on the device the code is running on. Better PCs will have more efficient results - but this method allows us to run code on lesser-PCs or devices (like phones) without lag. 

This implementation utilizes the BlockSafetyChecker suite I have implemented to determine if paths are dangerous or safe - lava, water, cliffs, or tall block structures are naturally not safe. However, it is possible for it to jump gaps if you allow your entity to jump.

## Customization
To customize the pathfinder and its settings use the AStarOptions.ts class. This is provided into the AStar class when you construct it in order to get a path of blocks to traverse. For details on the options you can use, view the AStarOptions.ts file. The comments will display what you can do with it.

## Usage

### A* Pathfinding
```ts
const options: AStarOptions = new AStarOptions({x:0, y:0, z:0}, {x: 10, y:0, z:10}, world.getDimension("overworld"));
options.TypeIdsToConsiderPassable = ["minecraft:air"];
options.TypeIdsThatCannotBeJumpedOver = ["minecraft:oak_fence"];

let aStar: AStar;
try{
    aStar = new AStar(this.PathfindingOptions);
}catch(e){
    // Failed to construct - start/end blocks probably not loaded
    return false;
}

const blockPath: Block[] = await aStar.Pathfind();

// blockPath is now a path from start to finish
```

### Bidirectional A* Pathfinding
```ts
const options: AStarOptions = new AStarOptions({x:0, y:0, z:0}, {x: 10, y:0, z:10}, world.getDimension("overworld"));
options.TypeIdsToConsiderPassable = ["minecraft:air"];
options.TypeIdsThatCannotBeJumpedOver = ["minecraft:oak_fence"];

let aStar: BidirectionalAStar;
try{
    aStar = new BidirectionalAStar(this.PathfindingOptions);
}catch(e){
    // Failed to construct - start/end blocks probably not loaded
    return false;
}

const blockPath: Block[] = await aStar.Pathfind();

// blockPath is now a path from start to finish
```