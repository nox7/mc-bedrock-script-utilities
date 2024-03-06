import { Vector, Vector3 } from "@minecraft/server";

export class VectorUtils{
    /**
     * Returns if the X,Y,Z components of the vectors are equal.
     * @param vector1
     * @param vector2 
     * @returns 
     */
    public static AreEqual(vector1: Vector3, vector2: Vector3){
        return vector1.x === vector2.x
            && vector1.y === vector2.y
            && vector1.z === vector2.z;
    }

    /**
     * Returns the Vector3 as a comma delimited string
     * @param vector
     */
    public static GetAsString(vector: Vector3): string{
        return `${vector.x}, ${vector.y}, ${vector.z}`;
    }

    /**
     * Calculates the length (magnitude) of a Vector3
     * @param vector
     * @returns 
     */
    public static Magnitude(vector: Vector3): number{
        return Math.sqrt( 
            Math.pow(vector.x, 2)
            + Math.pow(vector.y, 2)
            + Math.pow(vector.z, 2)
        );
    }

    /**
     * Calculates the unit vector of the provided vector
     * @param vector 
     * @returns 
     */
    public static Unit(vector: Vector3): Vector3{
        const magnitude = VectorUtils.Magnitude(vector);
        return {
            x: vector.x / magnitude,
            y: vector.y / magnitude,
            z: vector.z / magnitude
        }
    }
}