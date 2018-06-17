import { DiceSet } from "./DiceSet";

export interface ExplodingRoll {
    sum: boolean;
    tn?: number;
    raises: boolean;
}

export interface Roll {
    diceSet: DiceSet;
    exploding?: ExplodingRoll;
}

function toExplodingCode(e:ExplodingRoll): string {
    return "!" +
        (e.sum ? "" : "k") +
        (e.tn !== undefined ? "t" + e.tn : "") +
        (e.raises ? "s5" : "");
}

export function toDiceCode(r:Roll):string {
    return r.diceSet.toString() + (
        r.exploding !== undefined ? toExplodingCode(r.exploding) : ""
    );
}
