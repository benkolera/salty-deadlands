import { DiceSet, stepTraitType } from "./DiceSet";
import * as _ from "lodash";

export interface PureAptitude {
    type: "pure";
    value: number;
}

export interface AptitudeWithConcentrations {
    type: "concentrated";
    concentrations: { [key:string]:PureAptitude };
}

export type Aptitude = PureAptitude | AptitudeWithConcentrations;

export interface Trait {
    diceSet: DiceSet;
    aptitudes: { [x:string]:Aptitude };
}

export interface SimpleEffect {
    type: "simple";
    desc?: string;
}

export interface PassiveEffect {
    type: "passive";
    bonus: Bonus;
    desc?: string;
}

export interface SpellEffect {
    type: "spell";
    spellInputDesc: string;
    bonusFunc: ((rollRes:number) => Bonus | null);
    desc?: string;
}

export type Effect = SimpleEffect | PassiveEffect | SpellEffect;

export type EffectSet = { [key:string]: Effect };

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

export interface AttributeBonus {
    type: "bonus";
    bonus: number;
}

export interface AttributeDiceSub {
    type: "dice_sub";
    newDice: DiceSet;
}

export interface AttributeDicePromote {
    type: "dice_promote";
    faces: number;
}

export type AttributeEffect = AttributeBonus | AttributeDiceSub | AttributeDicePromote;

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

export interface AptitudeBonus {
    type: "aptitude";
    filter: AptitudeFilter;
    effect: AttributeEffect;
    reason: string;
}

export interface LightArmorBonus {
    type: "light_armor";
    bonus: number;
    reason: string;
}

export type Bonus = AptitudeBonus | LightArmorBonus;

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

    return _.sortBy(attrBonuses, x => x.effect.type === "dice_sub" ? 0 : 1).reduce(
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

export interface CharacterSheet {
    traits: Traits;
    edges: EffectSet;
    hinderances: EffectSet;
    knacks: EffectSet;
    blessings: EffectSet;
    size: number;
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

export const gabriela:CharacterSheet = {
    traits: {
        Deftness: {
            diceSet: new DiceSet(4, 8),
            aptitudes: {
                Shootin: concentrated({
                    Shotgun: pureApt(2),
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
            desc: "Use Spirit roll for Overawe.",
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
