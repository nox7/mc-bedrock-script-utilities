import { Vector3 } from "@minecraft/server";

export default class CuboidRegion{
    public Corner1: Vector3;
    public Corner2: Vector3;
    public CuboidRadius: number;
    public IsVerticallyFlat: boolean;

    public static FromCenterLocation(location: Vector3, cuboidRadius: number, isVerticallyFlat: boolean){
        cuboidRadius = Math.round(cuboidRadius);
        const corner1: Vector3 = {
            x: location.x - cuboidRadius,
            y: (!isVerticallyFlat ? (location.y - cuboidRadius) : location.y),
            z: location.z - cuboidRadius,
        };
        const corner2: Vector3 = {
            x: location.x + cuboidRadius,
            y: (!isVerticallyFlat ? (location.y + cuboidRadius) : location.y),
            z: location.z + cuboidRadius,
        }
        return new CuboidRegion(corner1, corner2, cuboidRadius, isVerticallyFlat);
    }

    /**
     * Gets a list of Vector3s that lie on the outer edge of a cube at the centerLocation with the provided cuboidRadius
     * @param centerLocation
     * @param cuboidRadius 
     */
    public static GetPositionsAlongOuterEdgeOfCube(centerLocation: Vector3, cuboidRadius: number){
        const existingPositionsHashMap: {[key: string]: boolean} = {};
        const positions: Vector3[] = [];
        // Get left side of cube
        for (let x = -cuboidRadius; x == -cuboidRadius; x++){
            for (let y = -cuboidRadius; y <= cuboidRadius; y++){
                for (let z = -cuboidRadius; z <= cuboidRadius; z++){
                    const hash = `${x},${y},${z}`;
                    if (!(hash in existingPositionsHashMap)){
                        positions.push({
                            x: centerLocation.x + x,
                            y: centerLocation.y + y,
                            z: centerLocation.z + z,
                        });
                        existingPositionsHashMap[hash] = true;
                    }
                }
            }
        }

        // Get ride side of cube
        for (let x = cuboidRadius; x == cuboidRadius; x++){
            for (let y = -cuboidRadius; y <= cuboidRadius; y++){
                for (let z = -cuboidRadius; z <= cuboidRadius; z++){
                    const hash = `${x},${y},${z}`;
                    if (!(hash in existingPositionsHashMap)){
                        positions.push({
                            x: centerLocation.x + x,
                            y: centerLocation.y + y,
                            z: centerLocation.z + z,
                        });
                        existingPositionsHashMap[hash] = true;
                    }
                }
            }
        }

        // Get top side of cube
        for (let y = cuboidRadius; y == cuboidRadius; y++){
            for (let x = -cuboidRadius; x <= cuboidRadius; x++){
                for (let z = -cuboidRadius; z <= cuboidRadius; z++){
                    const hash = `${x},${y},${z}`;
                    if (!(hash in existingPositionsHashMap)){
                        positions.push({
                            x: centerLocation.x + x,
                            y: centerLocation.y + y,
                            z: centerLocation.z + z,
                        });
                        existingPositionsHashMap[hash] = true;
                    }
                }
            }
        }

        // Get bottom side of cube
        for (let y = -cuboidRadius; y == -cuboidRadius; y++){
            for (let x = -cuboidRadius; x <= cuboidRadius; x++){
                for (let z = -cuboidRadius; z <= cuboidRadius; z++){
                    const hash = `${x},${y},${z}`;
                    if (!(hash in existingPositionsHashMap)){
                        positions.push({
                            x: centerLocation.x + x,
                            y: centerLocation.y + y,
                            z: centerLocation.z + z,
                        });
                        existingPositionsHashMap[hash] = true;
                    }
                }
            }
        }

        // Get front side of cube
        for (let z = cuboidRadius; z == cuboidRadius; z++){
            for (let x = -cuboidRadius; x <= cuboidRadius; x++){
                for (let y = -cuboidRadius; y <= cuboidRadius; y++){
                    const hash = `${x},${y},${z}`;
                    if (!(hash in existingPositionsHashMap)){
                        positions.push({
                            x: centerLocation.x + x,
                            y: centerLocation.y + y,
                            z: centerLocation.z + z,
                        });
                        existingPositionsHashMap[hash] = true;
                    }
                }
            }
        }

        // Get back side of cube
        for (let z = -cuboidRadius; z == -cuboidRadius; z++){
            for (let x = -cuboidRadius; x <= cuboidRadius; x++){
                for (let y = -cuboidRadius; y <= cuboidRadius; y++){
                    const hash = `${x},${y},${z}`;
                    if (!(hash in existingPositionsHashMap)){
                        positions.push({
                            x: centerLocation.x + x,
                            y: centerLocation.y + y,
                            z: centerLocation.z + z,
                        });
                        existingPositionsHashMap[hash] = true;
                    }
                }
            }
        }

        return positions;
    }

    public constructor(corner1: Vector3, corner2: Vector3, cuboidRadius: number, isVerticallyFlat: boolean){
        this.Corner1 = corner1;
        this.Corner2 = corner2;
        this.CuboidRadius = cuboidRadius;
        this.IsVerticallyFlat = isVerticallyFlat;
    }

    /**
     * Gets all the Vector3 locations that are contained within this region
     */
    public GetAllLocationsInRegion(): Vector3[]{
        const locations: Vector3[] = [];
        const top: Vector3 = {
            x: Math.min(this.Corner1.x, this.Corner2.x),
            y: Math.min(this.Corner1.y, this.Corner2.y),
            z: Math.min(this.Corner1.z, this.Corner2.z),
        };

        const bottom: Vector3 = {
            x: Math.max(this.Corner1.x, this.Corner2.x),
            y: Math.max(this.Corner1.y, this.Corner2.y),
            z: Math.max(this.Corner1.z, this.Corner2.z),
        };

        for (let x = top.x; x <= bottom.x; x++){
            for (let y = top.y; y <= bottom.y; y++){
                for (let z = top.z; z <= bottom.z; z++){
                    locations.push({x: x, y: y, z :z});
                }
            }
        }

        return locations;
    }
}