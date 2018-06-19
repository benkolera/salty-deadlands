import { Chance } from "chance";

export type Sides = 4 | 6 | 8 | 10 | 12 | 20;
export type TraitResult = "bust" | number;
export type Successes = number;
export type Raises = number;
export type VsTn<A> = "bust" | "failure" | A;

export interface OpposedDraw {
    type: "draw";
    attackerBusted: boolean;
    defenderBusted: boolean;
}
export interface OpposedWin {
    type: "attacker" | "defender";
    raises: Raises;
    loserBusted: boolean;
}
export type OpposedResult = OpposedDraw | OpposedWin;

export function mapVsTn<A, B>(vstn: VsTn<A>, f: (a: A) => B): VsTn<B> {
    if (vstn === "bust" || vstn === "failure") {
        return vstn;
    } else {
        return f(vstn);
    }
}

export function flatmapVsTn<A, B>(
    vstn: VsTn<A>,
    f: (a: A) => VsTn<B>,
): VsTn<B> {
    if (vstn === "bust" || vstn === "failure") {
        return vstn;
    } else {
        return f(vstn);
    }
}

const traitSides: Sides[]   = [4, 6, 8, 10, 12];
const damageSides: Sides[] = [4, 6, 8, 10, 12, 20];

export interface DiceSetCloneI {
    num?: number;
    sides?: Sides;
    bonus?: number;
}

export interface ExplodingRoll {
    sum: boolean;
    tn?: number;
    raises: boolean;
}

function toExplodingCode(e:ExplodingRoll): string {
    return "!" +
        (e.sum ? "" : "k") +
        (e.tn !== undefined ? "t" + e.tn : "") +
        (e.raises ? "s5" : "");
}

export class DiceSet {
    sides: Sides;
    num: number;
    bonus: number;
    constructor(num:number, sides:Sides, bonus: number = 0) {
        this.sides = sides;
        this.num   = num;
        this.bonus = bonus;
    }
    clone(args:DiceSetCloneI):DiceSet {
        return new DiceSet(
            args.num === undefined ? this.num : args.num,
            args.sides === undefined ? this.sides : args.sides,
            args.bonus === undefined ? this.bonus : args.bonus,
        );
    }
    addBonus(bonus:number): DiceSet {
        return this.clone({ bonus: this.bonus + bonus });
    }
    toFgCode(exploding?:ExplodingRoll): string {
        return this.toString() + (
            exploding !== undefined ? toExplodingCode(exploding) : ""
        );
    }
    toString() {
        const bonusSign = this.bonus > 0 ? "+" : "";
        const bonus = this.bonus !== 0 ? `${bonusSign}${ this.bonus }` : "";
        return `${ this.num }d${ this.sides }${ bonus }`;
    }
}

// tslint:disable-next-line:function-name
export function _rollDie(
    chance: Chance.Chance,
    sides: number,
    total: number= 0,
    rerolls: number= 10,
): number {
    const res = chance.natural({ max: sides });
    if (rerolls === 0 || res < sides) {
        return total + res;
    } else {
        return _rollDie(chance, sides, total + res, rerolls - 1);
    }
}

// tslint:disable-next-line:function-name
export function _bustedOrMax(results: number[]): TraitResult {
    const ones = results.filter(n => n === 1).length;
    if (ones > results.length - ones) {
        return "bust";
    } else {
        return Math.max(...results);
    }
}

// tslint:disable-next-line:function-name
function _stepSides(
    allSides: Sides[],
    timesLeft: number,
    num: number,
    sides: Sides,
    bonus: number,
): DiceSet {
    if (timesLeft === 0) {
        return new DiceSet(num, sides, bonus);
    } else {
        const i = allSides.indexOf(sides);
        if (i === allSides.length - 1) {
            return _stepSides(allSides, timesLeft - 1, num, sides, bonus + 2);
        } else {
            return _stepSides(allSides, timesLeft - 1, num, allSides[i + 1], 0);
        }
    }
}

export function stepTraitType(ds: DiceSet, times: number= 1): DiceSet {
    return _stepSides(traitSides, times, ds.num, ds.sides, ds.bonus);
}

export function stepDamage(ds: DiceSet, times: number= 1): DiceSet {
    return _stepSides(damageSides, times, ds.num, ds.sides, ds.bonus);
}

function rollDice(chance: Chance.Chance, ds: DiceSet): number[] {
    return Array.from(
        { length: ds.num },
        (v, k) => _rollDie(chance, ds.sides),
    );
}

export function rollDamage(chance: Chance.Chance, ds: DiceSet): number {
    return rollDice(chance, ds).reduce((a, b) => a + b, 0);
}

// tslint:disable-next-line:function-name
export function _traitResult(
    diceRes: number[],
    bonus: number,
): TraitResult {
    const out = _bustedOrMax(diceRes);
    if (out !== "bust") {
        return out + bonus;
    } else {
        return "bust";
    }
}

export function rollTrait(chance: Chance.Chance, ds: DiceSet): TraitResult {
    return _traitResult(rollDice(chance, ds), ds.bonus);
}

// tslint:disable-next-line:function-name
export function _successes(diff:number):Successes {
    return 1 + Math.floor(diff / 5);
}

// tslint:disable-next-line:function-name
export function _successesVsTn(
    res: TraitResult,
    tn: number,
): VsTn<Successes> {
    return mapVsTn(
        _aboveTn(res, tn),
        _successes,
    );
}

export function successesVsTn(
    chance: Chance.Chance,
    ds: DiceSet,
    tn: number,
): VsTn<Successes> {
    return _successesVsTn(rollTrait(chance, ds), tn);
}

// tslint:disable-next-line:function-name
export function _aboveTn(res: TraitResult, tn: number): VsTn<number> {
    if (res === "bust") {
        return "bust";
    } else if (res >= tn) {
        return res - tn;
    } else {
        return "failure";
    }
}

export function aboveTn(
    chance: Chance.Chance,
    ds: DiceSet,
    tn: number,
): VsTn<number> {
    return _aboveTn(rollTrait(chance, ds), tn);
}

// tslint:disable-next-line:function-name
export function _opposedRoll(
    attackRes:VsTn<number>,
    defendRes:VsTn<number>,
):OpposedResult {
    const a = attackRes === "bust" || attackRes === "failure"
        ? -1
        : attackRes;
    const d = defendRes === "bust" || defendRes === "failure"
        ? -1
        : defendRes;

    if (a === d) {
        return {
            type: "draw",
            attackerBusted: attackRes === "bust",
            defenderBusted: defendRes === "bust",
        };
    } else {
        const aRaises = a > 0 ? _successes(a) - 1 : 0;
        const dRaises = d > 0 ? _successes(d) - 1 : 0;

        if (a > d) {
            return {
                type: "attacker",
                raises: Math.max(0, aRaises - dRaises),
                loserBusted: defendRes === "bust",
            };
        } else {
            return {
                type: "defender",
                raises: Math.max(0, dRaises - aRaises),
                loserBusted: attackRes === "bust",
            };
        }
    }
}

export const opposedRoll = (
    chance: Chance.Chance,
    attackerDs: DiceSet,
    defenderDs: DiceSet,
): OpposedResult => {
    return _opposedRoll(
        aboveTn(chance, attackerDs, 5),
        aboveTn(chance, defenderDs, 5),
    );
};
