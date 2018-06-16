import { DiceSet, stepTraitType } from "./DiceSet";
import * as _ from "lodash";

/*
This file describes a pure representation of a deadlands character

Primariy, this describes Traits (Deftness, Vigor, Etc.)
Aptitudes: Deftness: Shootin: Shotguns or Sprit:Faith

Traits have a dice set (e.g 4d10). Aptitudes have a dice number. To roll 
an aptitude, you take the dice set of the parent trait and apply the number
for the aptitude to it.

Say if you have Spirit : 4d12 and Faith: 5, your faith roll would be 5d12
If you have Cognition 4d12 and Search 1, your search roll is 1d12.

To roll, you roll the set of dice taking the highest. If the dice rolls maximum,
then you get to roll that dice again and add it to the originally rolled dice.

Say if you have 5d12 and you roll [3,4,7,9,11], the score is 11.
If you have 5d12 and you roll [12,3,4,5,6] you roll another d12 and add it to the 12. (e.g 12+6 = 18).

If you roll a majority of 1s, you bust regardless of any other dice rolls.

See DiceSet and its test for more details.

The rest of the information on the character are things that can modify the aptitudes (e.g Spell Buffs).
*/

// Aptitudes are either leaf pure values or they are a concentration group like Shootin.
export interface PureAptitude {
    type: "pure";
    value: number;
}

export interface AptitudeWithConcentrations {
    type: "concentrated";
    concentrations: { [key:string]:PureAptitude };
}

export type Aptitude = PureAptitude | AptitudeWithConcentrations;

// A trait (e.g Spirit) is a dice set and a set of aptitudes
export interface Trait {
    diceSet: DiceSet;
    aptitudes: { [x:string]:Aptitude };
}

// We've got a whole heap of things that can affect our character

// An attribute bonus adds a positive or negative to the roll.
// This adds or subtracts from the final total of the roll.
// 
// We call it attribute rather than aptitude because it can apply to
// a aptitude or trait.
export interface AttributeBonus {
    type: "bonus";
    bonus: number;
}

// Some bonuses replace a diceset entirely
export interface AttributeDiceSub {
    type: "dice_sub";
    newDice: DiceSet;
}

// Some bonuses promote the dice side (e.g d6 to d8, d12 to d12+2)
export interface AttributeDicePromote {
    type: "dice_promote";
    faces: number;
}

export type AttributeBonusEffect = AttributeBonus | AttributeDiceSub | AttributeDicePromote;

// These records are used to fuzzy match spell effects to attributes
export interface AptitudeFilter {
    traitName?: string;
    concentrationName?: string | null;
    aptitudeName?: string | null;
}

export interface AptitudeKey {
    traitName: string;
    concentrationName?: string;
    aptitudeName: string;
}

// Attribute Bonuses fuzzy match aptitudes and apply a bonus 
// if they match.
export interface AptitudeBonus {
    type: "aptitude";
    filter: AptitudeFilter;
    effect: AttributeBonusEffect;
    reason: string;
}

// Light armor bonus just adds to the light armor rating of the character
export interface LightArmorBonus {
    type: "light_armor";
    bonus: number;
    reason: string;
}

export type Bonus = AptitudeBonus | LightArmorBonus;

// Complicated fuzzy matching logic for filter keys
// the ides is that an empty filter matches everything
// To match a trait you need to set aptitude and concentration to null
function filterKeyApplies(filter?:string | null, key?:string | null): boolean {
    return filter === undefined || key === undefined || filter === key;
}

export function bonusApplies(key:AptitudeFilter):(b:Bonus) => boolean {
    return (bonus:Bonus) => {
        if (bonus.type === "aptitude") {
            const { filter } = bonus;
            return (
                filterKeyApplies(filter.traitName, key.traitName) &&
                filterKeyApplies(filter.aptitudeName, key.aptitudeName) &&
                filterKeyApplies(filter.concentrationName, key.concentrationName)
            );
        } else {
            return false;
        }
    };
}

export function applyAptitudeBonuses(ds:DiceSet, bs:Bonus[]):DiceSet {
    const attrBonuses:AptitudeBonus[] = bs.filter(x => x.type === "aptitude") as AptitudeBonus[];

    // this sorting is a good indication that this composition should be applied in FRP land
    // rather than in our imperative world.
    return _.sortBy(
        attrBonuses,
        (x) => {
            switch (x.effect.type) {
            case "dice_sub": { return 0; }
            case "dice_promote": { return 1; }
            default: { return 2; }
            }
        },
    ).reduce(
        (acc, b) => {
            if (b.effect.type === "bonus") {
                return acc.addBonus(b.effect.bonus);
            } else if (b.effect.type === "dice_sub") {
                return b.effect.newDice;
            } else if (b.effect.type === "dice_promote") {
                return stepTraitType(acc, b.effect.faces);
            } else {
                return acc;
            }
        },
        ds,
    );
}
// Simple effects just have a description for stuff that isn't automated
export interface SimpleEffect {
    type: "simple";
    desc?: string;
}

// Passive Effects always apply their bonus
export interface PassiveEffect {
    type: "passive";
    bonus: Bonus;
    desc?: string;
}

// Spell effects require a roll and the bonus is calculated from that.
export interface SpellEffect {
    type: "spell";
    spellInputDesc: string;
    bonusFunc: ((rollRes:number) => Bonus | null);
    desc?: string;
}

export type Effect = SimpleEffect | PassiveEffect | SpellEffect;

export type EffectSet = { [key:string]: Effect };

// These are all of the traits for our character.
export interface Traits {
    [key:string]: Trait;
    Deftness: Trait;
    Nimbleness: Trait;
    Quickness: Trait;
    Strength: Trait;
    Vigor: Trait;
    Cognition: Trait;
    Knowledge: Trait;
    Mien: Trait;
    Smarts: Trait;
    Spirit: Trait;
}


export interface CharacterSheet {
    traits: Traits;
    // Edges are good effects that your character has
    edges: EffectSet;
    // Hinderances are the opposite
    hinderances: EffectSet;
    // Knacks are a supernatural kind of edge
    knacks: EffectSet;
    // Blessings are priestly spells
    blessings: EffectSet;
    // Size determines how many wounds you take from damage
    // you take floor(damage / size) wounds when you take damage
    size: number;
    // Light armor subtracts from damage before it is divided by size for wounds.
    lightArmor: number;
}

const pureApt = (apt:number):PureAptitude => {
    return {
        type: "pure",
        value: apt,
    };
};

const concentrated = (rec: {[key:string]:PureAptitude}):AptitudeWithConcentrations => {
    return {
        type: "concentrated",
        concentrations: rec,
    };
};

// And this is the actual data that powers my character.
export const gabriela:CharacterSheet = {
    traits: {
        Deftness: {
            diceSet: new DiceSet(4, 8),
            aptitudes: {
                Shootin: concentrated({
                    Shotgun: pureApt(3),
                }),
            },
        },
        Nimbleness: {
            diceSet: new DiceSet(4, 8),
            aptitudes: {
                Fightin: concentrated({
                    Brawlin: pureApt(4),
                }),
                Climbin: pureApt(1),
            },
        },
        Quickness: {
            diceSet: new DiceSet(2, 10),
            aptitudes: {},
        },
        Strength: {
            diceSet: new DiceSet(4, 6),
            aptitudes: {},
        },
        Vigor: {
            diceSet: new DiceSet(3, 12),
            aptitudes: {},
        },
        Cognition: {
            diceSet: new DiceSet(4, 12),
            aptitudes: {
                Scruitinize: pureApt(3),
                Search: pureApt(2),
            },
        },
        Knowledge: {
            diceSet: new DiceSet(3, 8),
            aptitudes: {
                Latin: pureApt(2),
                English: pureApt(2),
                Spanish: pureApt(2),
                Occult: pureApt(2),
                Theology: pureApt(2),
                "Local Area": concentrated({
                    Chihuahua: pureApt(2),
                }),
            },
        },
        Mien: {
            diceSet: new DiceSet(4, 6),
            aptitudes: {
                Overawe: pureApt(0),
            },
        },
        Smarts: {
            diceSet: new DiceSet(1, 8),
            aptitudes: {},
        },
        Spirit: {
            diceSet: new DiceSet(4, 12),
            aptitudes: {
                Faith: pureApt(5),
                Guts: pureApt(4),
            },
        },
    },
    edges: {
        "Arcane: Blessed": {
            type: "simple",
            desc: "Gives the ability to cast blessed based spells.",
        },
        Brave: {
            type: "passive",
            bonus: {
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
            },
            desc: "+2 to Guts checks",
        },
        "Level Headed": {
            type: "simple",
            desc: "When you draw initiative cards, you may discard a card and grab another.",
        },
        "Nerves of Steel": {
            type: "simple",
            // tslint:disable-next-line:max-line-length
            desc: "Character may choose not to flee on a failed guts check. Still takes usual penalities.",
        },
        "The Stare": {
            type: "passive",
            bonus: {
                type: "aptitude",
                filter: {
                    traitName: "Mien",
                    aptitudeName: "Overawe",
                    concentrationName: null,
                },
                effect: {
                    type: "bonus",
                    bonus: 2,
                },
                reason: "The Stare",
            },
            desc: "+2 to Overawe as long as the target can see your face (30 feet)",
        },
    },
    hinderances: {
        "Oath (Church)": {
            type: "simple",
        },
        Ferner: {
            type: "simple",
        },
        Poverty: { type: "simple" },
        Heroic: {
            type: "simple",
        },
    },
    blessings: {
        "Armor of Righteousness": {
            type: "spell",
            spellInputDesc: "dice total",
            bonusFunc: (amount) => {
                return {
                    type: "light_armor",
                    bonus: amount,
                    reason: "Armor of Righteousness",
                };
            },
            // tslint:disable-next-line:max-line-length
            desc: "Beat a TN 5 Spirit Roll and get the amount rolled as a light armor bonus for that round.",
        },
        Smite: {
            type: "spell",
            spellInputDesc: "successes",
            bonusFunc: (successes) => {
                return {
                    type: "aptitude",
                    filter: {
                        traitName: "Strength",
                        concentrationName: null,
                        aptitudeName: null,
                    },
                    effect: {
                        type: "dice_promote",
                        faces: successes,
                    },
                    reason: "Armor of Righteousness",
                };
            },
            // tslint:disable-next-line:max-line-length
            desc: "Beat a TN 5 Spirit Roll and bump up a trait die face for every success.",
        },
        Chastise: {
            type: "passive",
            bonus: {
                type: "aptitude",
                filter: {
                    traitName: "Mien",
                    aptitudeName: "Overawe",
                    concentrationName: null,
                },
                effect: {
                    type: "dice_sub",
                    newDice: new DiceSet(5, 12),
                },
                reason: "Chastise (Blessing)",
            },
            desc: "Use Faith roll for Overawe.",
        },
        "Lay on Hands": {
            type: "simple",
            // tslint:disable-next-line:max-line-length
            desc: "Heals: Wind (TN 3), Light (TN 5), Heavy (TN 7), Serious (TN 9), Critical (TN 11), Maimed (Limbs Only: TN 13). Cannot heal self. Failing the TN means damage applies to caster.",
        },
        "Holy Roller": {
            type: "simple",
            // tslint:disable-next-line:max-line-length
            desc: "TN 5 Spirit Check to gain a chip that must be used on next action. Fail and lose highest chip. 1 Success = White Chip. 2 Successes == Red, 3 Successes = Blue",
        },
        Protection: {
            type: "simple",
            // tslint:disable-next-line:max-line-length
            desc: "Opposed spirit check that prevents harm from supernatural evil.",
        },
    },
    knacks: {
        "Born on Christmas": {
            type: "simple",
            desc: "Can spend chips to grant immunity to dark magics",
        },
    },
    size: 6,
    lightArmor: 0,
};
