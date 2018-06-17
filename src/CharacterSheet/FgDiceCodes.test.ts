import "jest";
import { DiceSet } from "./DiceSet";
import { toDiceCode } from "./FgDiceCodes";

describe("toDiceCode", () => {
    test("Return diceset with no explosions", () => {
        expect(toDiceCode({ diceSet: new DiceSet(5, 12) })).toEqual("5d12");
    });
    test("Return diceset with a bonus and no explosions", () => {
        expect(toDiceCode({ diceSet: new DiceSet(5, 12, 2) })).toEqual("5d12+2");
    });
    test("Return diceset with explosions summed", () => {
        expect(toDiceCode({
            diceSet: new DiceSet(5, 12, 2),
            exploding: {
                sum: true,
                raises: false,
            },
        })).toEqual("5d12+2!");
    });
    test("Return diceset with explosions and keep highest", () => {
        expect(toDiceCode({
            diceSet: new DiceSet(5, 12, 2),
            exploding: {
                sum: false,
                raises: false,
            },
        })).toEqual("5d12+2!k");
    });
    test("Return diceset against tn with to raises", () => {
        expect(toDiceCode({
            diceSet: new DiceSet(5, 12, 2),
            exploding: {
                sum: false,
                tn: 7,
                raises: false,
            },
        })).toEqual("5d12+2!kt7");
    });
    test("Return diceset against tn with raises", () => {
        expect(toDiceCode({
            diceSet: new DiceSet(5, 12, 2),
            exploding: {
                sum: false,
                tn: 7,
                raises: true,
            },
        })).toEqual("5d12+2!kt7s5");
    });
});
