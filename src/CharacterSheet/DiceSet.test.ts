import "jest";
import {
    DiceSet, mapVsTn, flatmapVsTn, _bustedOrMax, stepTraitType, stepDamage,
    _traitResult, _successesVsTn, _aboveTn, _opposedRoll, VsTn,
} from "./DiceSet";

describe("toDiceCode", () => {
    test("Return diceset with no explosions", () => {
        expect(new DiceSet(5, 12).toFgCode()).toEqual("5d12");
    });
    test("Return diceset with a bonus and no explosions", () => {
        expect(new DiceSet(5, 12, 2).toFgCode()).toEqual("5d12+2");
    });
    test("Return diceset with explosions summed", () => {
        expect(new DiceSet(5, 12, 2).toFgCode({
            sum: true,
            raises: false,
        })).toEqual("5d12+2!");
    });
    test("Return diceset with explosions and keep highest", () => {
        expect(new DiceSet(5, 12, 2).toFgCode({
            sum: false,
            raises: false,
        })).toEqual("5d12+2!k");
    });
    test("Return diceset against tn with to raises", () => {
        expect(new DiceSet(5, 12, 2).toFgCode({
            sum: false,
            tn: 7,
            raises: false,
        })).toEqual("5d12+2!kt7");
    });
    test("Return diceset against tn with raises", () => {
        expect(new DiceSet(5, 12, 2).toFgCode({
            sum: false,
            tn: 7,
            raises: true,
        })).toEqual("5d12+2!kt7s5");
    });
});

describe("pure tests", () => {
    describe("mapVsTn", () => {
        test("should pass through", () => {
            expect(mapVsTn(5, x => x + 1)).toEqual(6);
        });
        test("should stop on bust or failure", () => {
            expect(mapVsTn("failure", x => x + 1)).toEqual("failure");
            expect(mapVsTn("bust", x => x + 1)).toEqual("bust");
        });
    });
    describe("flatMapVsTn", () => {
        test("should pass through", () => {
            expect(flatmapVsTn(5, x => x + 1)).toEqual(6);
        });
        test("should bust or fail from a value", () => {
            expect(flatmapVsTn(5, x => "failure")).toEqual("failure");
            expect(flatmapVsTn(5, x => "bust")).toEqual("bust");
        });
        test("should stop on bust or failure", () => {
            expect(flatmapVsTn("failure", x => x + 1)).toEqual("failure");
            expect(flatmapVsTn("failure", x => "bust")).toEqual("failure");
            expect(flatmapVsTn("bust", x => x + 1)).toEqual("bust");
            expect(flatmapVsTn("bust", x => "failure")).toEqual("bust");
        });
    });
    describe("bustedOrMax", () => {
        test("majority of 1s should bust", () => {
            expect(_bustedOrMax([1])).toEqual("bust");
            expect(_bustedOrMax([1, 1, 2])).toEqual("bust");
            expect(_bustedOrMax([1, 1, 1, 2, 4])).toEqual("bust");
        });
        test("take the highest when not majority 1s", () => {
            expect(_bustedOrMax([7])).toEqual(7);
            expect(_bustedOrMax([1, 2])).toEqual(2);
            expect(_bustedOrMax([1, 8, 1, 2, 4])).toEqual(8);
        });
    });
    describe("stepping dice", () => {
        test("should stop at d12 for traits", () => {
            expect(stepTraitType(new DiceSet(2, 4))).toEqual(new DiceSet(2, 6));
            expect(stepTraitType(new DiceSet(2, 4), 2)).toEqual(new DiceSet(2, 8));
            expect(stepTraitType(new DiceSet(2, 4), 3)).toEqual(new DiceSet(2, 10));
            expect(stepTraitType(new DiceSet(2, 4), 4)).toEqual(new DiceSet(2, 12));
            expect(stepTraitType(new DiceSet(2, 4), 5)).toEqual(new DiceSet(2, 12, 2));
            expect(stepTraitType(new DiceSet(2, 4), 6)).toEqual(new DiceSet(2, 12, 4));
        });
        test("should stop at d20 for damage", () => {
            expect(stepDamage(new DiceSet(2, 4))).toEqual(new DiceSet(2, 6));
            expect(stepDamage(new DiceSet(2, 4), 2)).toEqual(new DiceSet(2, 8));
            expect(stepDamage(new DiceSet(2, 4), 3)).toEqual(new DiceSet(2, 10));
            expect(stepDamage(new DiceSet(2, 4), 4)).toEqual(new DiceSet(2, 12));
            expect(stepDamage(new DiceSet(2, 4), 5)).toEqual(new DiceSet(2, 20));
            expect(stepDamage(new DiceSet(2, 4), 6)).toEqual(new DiceSet(2, 20, 2));
            expect(stepDamage(new DiceSet(2, 4), 7)).toEqual(new DiceSet(2, 20, 4));
        });
    });
    describe("trait result", () => {
        test("should apply bonus to highest dice if not busted", () => {
            expect(_traitResult([8, 2], 0)).toEqual(8);
            expect(_traitResult([8, 2], 2)).toEqual(10);
            expect(_traitResult([8, 2], -2)).toEqual(6);
        });
        test("should bust as per busted or max", () => {
            expect(_traitResult([1], 2)).toEqual("bust");
        });
    });
    describe("successes vs tn", () => {
        test("busts", () => {
            expect(_successesVsTn("bust", 5)).toEqual("bust");
        });
        test("below tn fails", () => {
            expect(_successesVsTn(4, 5)).toEqual("failure");
        });
        test("should start at 1 success and +1 for every 5 over", () => {
            expect(_successesVsTn(5, 5)).toEqual(1);
            expect(_successesVsTn(9, 5)).toEqual(1);
            expect(_successesVsTn(10, 5)).toEqual(2);
            expect(_successesVsTn(12, 7)).toEqual(2);
        });
    });
    describe("above tn", () => {
        test("busts", () => {
            expect(_aboveTn("bust", 5)).toEqual("bust");
        });
        test("below tn fails", () => {
            expect(_successesVsTn(4, 5)).toEqual("failure");
        });
        test("should start at 1 success and +1 for every 5 over", () => {
            expect(_successesVsTn(5, 5)).toEqual(1);
            expect(_successesVsTn(9, 5)).toEqual(1);
            expect(_successesVsTn(10, 5)).toEqual(2);
            expect(_successesVsTn(12, 7)).toEqual(2);
        });
    });
    describe("opposedRoll", () => {
        test("draws properly", () => {
            const bads = ["bust", "failure"] as VsTn<number>[];

            bads.forEach((b1) => {
                bads.forEach((b2) => {
                    expect(_opposedRoll(b1, b2)).toEqual({
                        type: "draw",
                        attackerBusted: b1 === "bust",
                        defenderBusted: b2 === "bust",
                    });
                });
            });

            expect(_opposedRoll(0, 0)).toEqual({
                type: "draw",
                attackerBusted: false,
                defenderBusted: false,
            });
        });
        test("attacker wins", () => {
            expect(_opposedRoll(1, "bust")).toEqual({
                type: "attacker",
                raises: 0,
                loserBusted: true,
            });
            expect(_opposedRoll(1, "failure")).toEqual({
                type: "attacker",
                raises: 0,
                loserBusted: false,
            });
            expect(_opposedRoll(1, 0)).toEqual({
                type: "attacker",
                raises: 0,
                loserBusted: false,
            });
            expect(_opposedRoll(5, 0)).toEqual({
                type: "attacker",
                raises: 1,
                loserBusted: false,
            });
            expect(_opposedRoll(10, 0)).toEqual({
                type: "attacker",
                raises: 2,
                loserBusted: false,
            });
        });
        test("raises of defender subtract from winning attacker", () => {
            expect(_opposedRoll(6, 5)).toEqual({
                type: "attacker",
                raises: 0,
                loserBusted: false,
            });
            expect(_opposedRoll(20, 19)).toEqual({
                type: "attacker",
                raises: 1,
                loserBusted: false,
            });
        });
        test("defender wins", () => {
            expect(_opposedRoll("bust", 1)).toEqual({
                type: "defender",
                raises: 0,
                loserBusted: true,
            });
            expect(_opposedRoll("failure", 1)).toEqual({
                type: "defender",
                raises: 0,
                loserBusted: false,
            });
            expect(_opposedRoll(0, 1)).toEqual({
                type: "defender",
                raises: 0,
                loserBusted: false,
            });
            expect(_opposedRoll(0, 5)).toEqual({
                type: "defender",
                raises: 1,
                loserBusted: false,
            });
            expect(_opposedRoll(0, 10)).toEqual({
                type: "defender",
                raises: 2,
                loserBusted: false,
            });
        });
        test("raises of attacker subtract from winning defender", () => {
            expect(_opposedRoll(5, 6)).toEqual({
                type: "defender",
                raises: 0,
                loserBusted: false,
            });
            expect(_opposedRoll(19, 20)).toEqual({
                type: "defender",
                raises: 1,
                loserBusted: false,
            });
        });
    });
});
