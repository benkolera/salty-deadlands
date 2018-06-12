import "jest";

import { bonusApplies, Bonus } from "./Model";

const gutsKey = { traitName: "Spirit", aptitudeName: "Guts", concentrationName: null };
const shotgunKey = { traitName: "Deftness", aptitudeName: "Shotgun", concentrationName: "Shootin" };
const pistolKey = { traitName: "Deftness", aptitudeName: "Pistol", concentrationName: "Shootin" };
const woundBonus:Bonus = {
    type: "aptitude",
    filter: {

    },
    effect: {
        type: "bonus",
        bonus: -2,
    },
    reason: "Wound Penalty",
};

const gutsBonus:Bonus = {
    type: "aptitude",
    filter: {
        traitName: "Spirit",
        aptitudeName: "Guts",
        concentrationName: null,
    },
    effect: {
        type: "bonus",
        bonus: 2,
    },
    reason: "Brave (Edge)",
};

const shotgunBonus:Bonus = {
    type: "aptitude",
    filter: {
        traitName: "Deftness",
        concentrationName: "Shootin",
        aptitudeName: "Shotgun",
    },
    effect: {
        type: "bonus",
        bonus: 2,
    },
    reason: "Made Up Bonus",
};

const lightArmorBonus:Bonus = {
    type: "light_armor",
    bonus: 22,
    reason: "Armor",
};

describe("pure tests", () => {
    test("Blank Bonus Matches", () => {
        expect(bonusApplies(shotgunKey)(woundBonus)).toEqual(true);
        expect(bonusApplies(gutsKey)(woundBonus)).toEqual(true);
    });
    test("Specific only matches the one", () => {
        expect(bonusApplies(shotgunKey)(gutsBonus)).toEqual(false);
        expect(bonusApplies(gutsKey)(gutsBonus)).toEqual(true);
        expect(bonusApplies(shotgunKey)(shotgunBonus)).toEqual(true);
        expect(bonusApplies(pistolKey)(shotgunBonus)).toEqual(false);
        expect(bonusApplies(
            { traitName: "Spirit", aptitudeName: null, concentrationName: null },
        )(gutsBonus)).toEqual(false);
    });
    test("Partial Matches", () => {
        expect(bonusApplies({ traitName: "Spirit" })(gutsBonus)).toEqual(true);
    });
    test("Light Armor Never Matches", () => {
        expect(bonusApplies({ traitName: "Spirit" })(lightArmorBonus)).toEqual(false);
        expect(bonusApplies(shotgunKey)(lightArmorBonus)).toEqual(false);
        expect(bonusApplies(gutsKey)(lightArmorBonus)).toEqual(false);
        expect(bonusApplies(pistolKey)(lightArmorBonus)).toEqual(false);
    });
});
