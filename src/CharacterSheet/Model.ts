import { DiceSet, stepTraitType } from "./DiceSet";
import * as _ from "lodash";
import { i } from "sodium-frp-react";

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
If you have 5d12 and you roll [12,3,4,5,6] you roll another d12 and add it to
the 12. (e.g 12+6 = 18).

If you roll a majority of 1s, you bust regardless of any other dice rolls.

See DiceSet and its test for more details.

The rest of the information on the character are things that can modify the
aptitudes (e.g Spell Buffs).
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
    shortDesc: string;
    desc?: string[];
}

// Passive Effects always apply their bonus
export interface PassiveEffect {
    type: "passive";
    bonus: Bonus;
    shortDesc: string;
    desc?: string[];
}

type Tn = number | "Opposed" | "Special";

// Spell effects require a roll and the bonus is calculated from that.
export interface SpellEffect {
    type: "spell";
    spellInputDesc: string;
    bonusFunc: ((rollRes:number) => Bonus | null);
    tn: Tn;
    speed: string;
    range: string;
    duration: number; // Just rounds for now.
    shortDesc: string;
    desc?: string[];
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

// tslint:disable:max-line-length
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
                Dodge: pureApt(0),
            },
        },
        Quickness: {
            diceSet: new DiceSet(2, 10),
            aptitudes: {
            },
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
            shortDesc: "Gives the ability to cast blessed based spells.",
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
            shortDesc: "+2 to Guts checks",
            desc: [
                "Most folks aren’t really brave—they’re just too stupid to know better. Maybe you’re different, but it’s doubtful.",
                "Characters with this Edge add +2 to their guts checks.",
            ],
        },
        "Level Headed": {
            type: "simple",
            shortDesc: "When you draw initiative cards, you may discard a card and grab another.",
            desc: [
                "Veteran gunmen claim speed and skill are vital, but they’re overrated compared to keeping your cool, aiming at your target, and putting it down. A hothead who empties his hogleg too fast soon finds himself taking root in the local bone orchard.",
                "Immediately after drawing Action Cards in combat, a character with this Edge can discard his lowest card and draw another. If the character draws a black Joker on the first draw, he’s out of luck and can’t draw again.",
            ],
        },
        "Nerves of Steel": {
            type: "simple",
            shortDesc: "Character may choose not to flee on a failed guts check. Still takes usual penalities.",
            desc: [
                "Some of the Weird West’s heroes are too darn stubborn to run even when their boots are full of “liquid fear.” Most of their skeletons lie bleaching in the desert, but a few are still fighting the horrors of the High Plains.",
                "Whenever the character fails a guts check and is forced to flee, the character can choose to stand his ground instead. He still suffers any other penalties, however",
                "A character with nerves o’ steel isn’t necessarily brave. Sometimes he’s just more afraid of being branded a yellowbellied coward than he is of death. Some folks are funny that way.",
            ],
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
            shortDesc: "+2 to Overawe as long as the target can see your face (30 feet)",
            desc: [
                "There’s something in your stare that makes others nervous. When your eye starts twitching, someone’s about to get carried to Boot Hill. Clint Eastwood has it, and so does your gunslinger.",
                "A character with “the stare” may add +2 to his overawe attacks as long as the intended victim is close enough to look into his steely gaze (usually less than 30 feet)",
            ],
        },
    },
    hinderances: {
        "Oath (Church)": {
            type: "simple",
            shortDesc: "To the catholic church, specifically.",
        },
        Ferner: {
            type: "simple",
            shortDesc: "She's not from around here.",
        },
        Poverty: {
            type: "simple",
            shortDesc: "Donates money when she can. Lives simply.",
        },
        Heroic: {
            type: "simple",
            shortDesc: "Cannot refuse a plea for help.",
            desc: [
                "You’re a sucker for someone in trouble. Ever hear of nice guys finishing last? Heroes who go chasing down wild critters aren’t likely to finish at all. At least they’ll write something nice on your tombstone.",
                "Your character can’t turn down a plea for help. She doesn’t have to be cheery about it, and she doesn’t have to be a “nice” person, but she always helps those in need eventually.",
            ],
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
            tn: 5,
            speed: "1 round",
            range: "Self",
            duration: 1,
            shortDesc: "Light armor bonus for a round",
            desc: [
                "Lately, good folks have been in short supply. Part of the problem is the good are always getting picked on by the bad—and the ugly as well. Recognizing it’s hard to fight the good fight from six feet under, the divine patrons of blessed heroes have given them a bit of holy reinforcement.",
                "This miracle provides the hero with protection from wounds. The result of his roll to invoke armor o’ righteousness is subtracted from any damage done to him during the round. Then, wound levels are calculated normally from the remaining damage.",
                "Armor o’ righteousness provides this protection against all damage suffered during the round. Additional effects from the attack that rely on damage being dealt (such as a rattlesnake’s poison) are lost if armor negates enough damage to prevent all wound levels.",
                "Once the damage has been reduced by the armor, any wound levels caused by the remaining damage incur Wind loss as normal. However, against brawling attacks, which normally cause only Wind loss, the armor does reduce the amount of Wind lost.",
            ],
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
            tn: 5,
            range: "Self",
            speed: "1 round",
            duration: 20, // 1 minute
            shortDesc: "Improve strength dice face for 1 minute.",
            desc: [
                "With this miracle, the blessed heroes of the Weird West can smite the evils of the Reckoning back into the last century.",
                "When invoked, the invoker’s Strength die type is raised +1 step for every success.",
            ],
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
                    newDice: new DiceSet(5, 12), // TODO: This should take faith dice
                },
                reason: "Chastise (Blessing)",
            },
            shortDesc: "Use Faith roll for Overawe.",
            desc: [
                "Hellfire and brimstone preacher when he’s berating a sinner. Even the toughest gunslingers are likely to back down under such abuse. And, just to be sure, chastise gives the blessed an extra boost in a shouting match.",
                "Chastise allows the blessed to use her faith Aptitude in place of the overawe Aptitude in a test of wills as described in the Deadlands rulebook.",
                "When this miracle is invoked, the blessed makes an opposed roll of her faith Aptitude versus her opponent’s guts. Any modifiers she would normally receive to overawe apply to this faith roll as well. If the blessed wins the roll, the subject suffers the effects of the test of wills, becoming unnerved, distracted, or even broken, depending on the level of the blessed’s success.",
            ],
        },
        "Refuge o' Faith": {
            type: "passive",
            bonus: {
                type: "aptitude",
                filter: {
                    traitName: "Nimbleness",
                    aptitudeName: "Dodge",
                    concentrationName: null,
                },
                effect: {
                    type: "dice_sub",
                    newDice: new DiceSet(5, 12), // TODO: This should take faith dice
                },
                reason: "Refuge o' Faith (Gift)",
            },
            shortDesc: "Use faith roll for Dodge",
            desc: [
                "All blessed heroes may not have a guardian angel looking after them, but they all have a whole lot of faith their deity will protect them from harm. This miracle goes a long way toward proving that belief well-founded.",
                "This gift lets the character use his faith Aptitude as an active defense in place of dodge or fightin’. Whenever he wants to try to avoid an attack, he follows the normal procedures for active defenses, except he rolls his faith instead of his dodge or fightin’ Aptitude. His attacker’s TN to hit him is now the greater of either his normal TN or the blessed’s faith roll.",
                "Of course, just like with any active defense, the character must spend his highest card to use this miracle. As always, any card up the hero’s sleeve is considered his highest.",
            ],
        },
        "Lay on Hands": {
            type: "simple",
            shortDesc: "Slow faith based healing",
            desc: [
                "Holy healers have been around since ancient times. They’ve just never been in such demand.",
                "The blessed use this miracle to heal the wounds and afflictions of others (not themselves). The problem is that if the healer is not truly faithful, he takes on the subject’s malady as well.",
                "The base TN for healing a subject’s wounds is shown on the chart below. Use the TN for the highest wound level the victim has sustained. The entry for “maimed” applies to severed limbs, diseases, blindness, and other extremely serious maladies. Maimed gizzards and noggins cannot be healed with this miracle. Working with dead folks takes a bit more doing.",
                "The blessed cannot bring back the truly dead with this miracle. That takes quite a bit more effort. Nor can the miracle heal the undead, like the Harrowed. Once a person’s breathed his last, there’s little that can be done for him.",
                "The blessed actually feels the victim’s pain, so she must subtract the patient’s total wound modifier from her roll. As usual, only the highest wound modifier applies, so if the blessed is already suffering a larger wound modifier of her own, she doesn’t suffer any additional effects.",
                "If the healer is successful, the victim is completely healed in all areas of his body. The patient maintains his wound modifiers for the next hour (due to stiffness in the healed areas), but he is not otherwise considered wounded.",
                "The bad news is that if the healer fails the roll, the patient isn’t cured, and the healer takes on the same maladies or wounds. If these are wounds, the blessed takes the victim’s highest wound level to the corresponding hit location on her own body. For example, if the victim’s highest wound level was a serious wound on his left arm, the blessed would take a serious wound to her own left arm, but she wouldn’t be affected by any of the patient’s other injuries.",
            ],
        },
        "Holy Roller": {
            type: "simple",
            shortDesc: "Get a chip that must be used next action.",
            desc: [
                "The blessed know asking for holy power is normally off-limits. But sometimes the horrors of the Weird West call for desperate measures. Right then, a little prayer for help can make all the difference.",
                "A blessed character can use this miracle to gain a chip from the Fate Pot. The chip must be used on her next action. If the character meets the difficulty, she gains a white chip. A raise nets her a red chip, and 2 raises gets her a blue chip.",
                "The chip can only be used for Trait or Aptitude checks or to avoid damage. For example, while it can’t be spent for Bounty Points, used as a sacrifice for consecrate weapon, or to activate a knack, but it could be used to help the blessed make her lay on hands roll.",
                "A chip gained in this manner can be given to another player with the sacrifice miracle, however, the receiving character must then use the chip on his next action. Likewise, the chip can only be spent to avoid damage or assist a Trait or Aptitude check.",
                "The downside is that if the blessed miracle worker fails the roll, her patron takes her highest chip (put it back in the pot) as penance. It’s a gamble—that’s why the blessed call this miracle “holy roller.” Of course, if she doesn’t have a chip, she can ignore this effect.",
            ],
        },
        Protection: {
            type: "simple",
            shortDesc: "Opposed spirit check that prevents harm from supernatural evil.",
            desc: [
                "One miracle used by all western religions is protection. This is simply reliance on one’s deity or deities to protect the faithful from supernatural evil. Any character with at least one level in the faith Aptitude may attempt this miracle by presenting her holy symbol or otherwise declaring the power of her deity. Like we said before, if your character is a follower of the Indian spirits, you can’t use this miracle, no matter how much faith you’ve got. The spirits do grant favors, just not this particular one.",
                "A supernaturally evil opponent must make a Spirit total versus the hero’s faith. Should it lose, the creature cannot touch the character or otherwise cause her direct harm. It could still push over a bookshelf the blessed happened to be standing under, but it couldn’t fire a weapon, cast a hex, or use its special abilities on her until it wins the spiritual contest.",
                "Of course, this doesn’t do the blessed’s companions a bit of good. They’re still fair game. Truly valiant heroes that have protection often find they can help the rest of their posse by standing directly between the horrific creature and their hapless friends. Be careful, though. This can be a really awkward place to be should the miracle suddenly fail.",
                "Faithful characters shouldn’t rely on this miracle too often, since the winner of the contest between the blessed and the beast is likely to waver back and forth. And any creature affected by protection probably doesn’t need more than one opening to finish the fight. Permanently.",
            ],
        },
    },
    knacks: {
        "Born on Christmas": {
            type: "simple",
            shortDesc: "Can spend chips to grant immunity to dark magics",
            desc: [
                "A babe born on Christmas is particularly resistant to arcane effects powered by evil spirits. If your character takes this knack and has the arcane background Edge, she may only be a blessed or a shaman. The knack has no effect on shamanic or blessed powers. It works on the tainted magic of hexes, weird gizmos, and black magic.",
                "Your character can use this knack even if she isn’t aware she’s a target of some foul magic She cannot, however, use the knack against a magic-using character who isn’t using an arcane effect directly on the heroine. If your buffalo gal sees a huckster cast a hex on himself or someone else, for instance, there’s nothing she can do about it.",
                "White: Against any type of damagecausing magic, a white chip provides 1 point of Armor. Against a resisted spell effect, the character gets to add +4 to his roll.",
                "Red: As above, but it gives 2 points of Armor and adds +4 to your heroine’s resistance roll (if there is one). A red chip is not cumulative with a white.",
                "Blue: A blue chip forces a backfire of some sort. Hucksters roll on the Backlash Table, mad scientists suffer a malfunction, and cultists get spanked by their dark masters for their incompetence. If the effect is caused by a creature’s special ability with no “backfire” results, the spell simply doesn’t affect your heroine.",
                "Legend: When a tainted supernatural spell or power affects your character, spend a Legend chip to make him immune to all the powers of the creature who cast it for the rest of the scene. A vampire could not charm the hero, for instance, but it could still bite her on the neck since that isn’t a supernatural power.",
            ],
        },
    },
    size: 6,
    lightArmor: 0,
};
// tslint:enable:max-line-length
