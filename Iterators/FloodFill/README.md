# Flood Fill Iterator
The flood-fill style iterator allows a developer to systematically - and performantly - iterate over blocks in "flood-fill" style in the Minecraft 3D space. By default, it is "entity-style" flood-fill in that it will check if the adjacent block can be jumped onto or safely fallen from as well.

There are many filters and properties that can be set on the options.

When set to "Y-axis" flood mode, then there are no safety checks - as it uniformly searches a 3x3 cube around a given location regardless if an entity could move to that location or not. This mode is mainly used to find a block *anywhere* in a given volume - and not specifically if an entity could reach it.

**Note**: By default, the iterator has no knowledge of which blocks are "air" (passable) or which you want to find. You have to provide these in the options. See the usages below for examples.

## Usage
The simple way (but not usually performant, and will cause Minecraft's Watchdog to complain) is to iterate with default settings like this:
```ts
const startLocation: Vector3 = {x: 0, y: 0, z: 0};
const dimension: Dimension = world.getDimension("overworld");
const maxDistance: number = 15; // Search within 15 blocks
const floodFillOptions = new FloodFillOptions(startLocation, dimension, maxDistance);
floodFillOptions.TypeIdsToConsiderPassable = ["minecraft:air"];
floodFillOptions.TypeIdsToAlwaysInclude = ["minecraft:stone"];
const floodFillIterator = new FloodFillIterator(floodFillOptions);

for (const block of floodFillIterator){
    if (block !== null & block.isValid()){
        // Do things with "block"
        // It will either be "air" or "stone" due to the TypeId options we set above
    }
}
```

However, for large regions that could cause a few ms of spike and would not be performant. Instead, you should write a wrapper and use `system.runJob()` with a JavaScript Promise callback. Below is the *most optimal* way to use the flood fill iterator to find a single block:
```ts
const startLocation: Vector3 = {x: 0, y: 0, z: 0};
const dimension: Dimension = world.getDimension("overworld");
const maxDistance: number = 15; // Search within 15 blocks
const floodFillOptions = new FloodFillOptions(startLocation, dimension, maxDistance);
floodFillOptions.TypeIdsToConsiderPassable = ["minecraft:air"];
floodFillOptions.TypeIdsToAlwaysInclude = ["minecraft:stone"];

function *FindFirstStoneBlock(
    blockFoundResolve: (block: Block | null) => void, 
    floodFillOptions: FloodFillOptions
    ){
    let blockThatWasFound: Block | null = null;
    const floodFillIterator = new FloodFillIterator(floodFillOptions);
    for (const block of floodFillIterator){
        if (block !== null & block.isValid()){
            if (block.typeId === "minecraft:stone"){
                blockThatWasFound = block;
                break;
            }
        }

        // Important to yield to allow the MC engine to control how often this iterator runs!
        yield;
    }

    return blockFoundResolve(blockThatWasFound);
}
```

Now, call that iterator with runJob and a wrapped promise that you can await
```ts
const blockFound = await new Promise<Block | null>(resolve => {
    system.runJob(FindFirstStoneBlock(resolve, floodFillOptions))
})
```

"blockFound" will be the block you wanted to find - or null if it didn't exist in the search region.

## Y-Axis Flood Filling
If you set FloodFillOptions.AllowYAxisFlood to `true`, then the nature of implementing the iterator is still the exact same as above - however, the iteration will ignore gravity and danger in general. It will flood a 3D space without care if the block could be jumped on, fallen to safely, etc. This is a true 3D flood-fill. When set to false, it does safety checks on blocks it iterates and cares about gravity (doesn't randomly flood upwards).

## Additional Properties
To see the full list of properties and their documentation, open the FloodFillIteratorOptions.ts file - all options you can set are documented.

## Examples of Use + Visualization
![image](https://github.com/nox7/mc-bedrock-script-utilities/assets/17110935/b771fa36-7cc9-4144-9b77-5895f3f3bfa0)
![image](https://github.com/nox7/mc-bedrock-script-utilities/assets/17110935/67c8ad96-24b1-42c4-91c1-8b594d73ec5b)
![image](https://github.com/nox7/mc-bedrock-script-utilities/assets/17110935/bb55d78a-9403-435d-ac80-2328bac32a2f)

Search visualization

![image](https://github.com/nox7/mc-bedrock-script-utilities/assets/17110935/d9c749b1-6e59-4872-a9dd-cb463a7b80bb)

