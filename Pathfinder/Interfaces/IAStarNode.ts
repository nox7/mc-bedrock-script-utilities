import { Block } from "@minecraft/server";

export interface IAStarNode {
    Block: Block;
    ParentNode: IAStarNode | null;
    FCost: number;
    GCost: number;
    HCost: number;
}