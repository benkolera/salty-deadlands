import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from "lodash";
import { DiceSet } from './DiceSet';
import St_TeresaJpg from '../../assets/St_Teresa.jpg';
import { Cell, CellLoop, Transaction } from 'sodiumjs';

import { SpellEffects, SpellEffectsFrp, wireSpellEffectsFrp } from './SpellEffects';
import { WoundTracker, WoundTrackerFrp, wireWoundTrackerFrp } from './WoundTracker';
import {
    TraitDisplay, TraitDisplayInput, wireTraitDisplayInput, wireTraitDisplayFrp,
} from './TraitDisplay';
import * as CS from "./Model";

export interface CharacterSheetInput {
    sheet: Cell<CS.CharacterSheet>;
}

export interface TraitsFrp {
    [key:string]: TraitDisplayInput;
    Deftness: TraitDisplayInput;
    Nimbleness: TraitDisplayInput;
    Quickness: TraitDisplayInput;
    Strength: TraitDisplayInput;
    Vigor: TraitDisplayInput;
    Cognition: TraitDisplayInput;
    Knowledge: TraitDisplayInput;
    Mien: TraitDisplayInput;
    Smarts: TraitDisplayInput;
    Spirit: TraitDisplayInput;
}

export interface CharacterSheetInternal {
    traitCells: TraitsFrp;
    woundTrackerFrp: WoundTrackerFrp;
    spellEffectsFrp: SpellEffectsFrp;
}

export interface CharacterSheetOutput {
}

export interface CharacterSheetFrp {
    input: CharacterSheetInput;
    internal: CharacterSheetInternal;
}

export function wireCharacterSheetFrp(input: CharacterSheetInput):CharacterSheetFrp {
    return Transaction.run(() => {
        const lightArmor = new CellLoop<number>();
        const woundInputs = {
            lightArmor,
            size: input.sheet.map(x => x.size),
        };

        const edges = input.sheet.map(x => x.edges);
        const hinderances = input.sheet.map(x => x.hinderances);
        const blessings = input.sheet.map(x => x.blessings);
        const knacks = input.sheet.map(x => x.knacks);

        const spellEffectsFrp:SpellEffectsFrp = wireSpellEffectsFrp({
            edges,
            hinderances,
            blessings,
            knacks,
        });
        const woundTrackerFrp = wireWoundTrackerFrp(woundInputs);

        const bonuses: Cell<CS.Bonus[]> = spellEffectsFrp.output.bonuses.lift(
            woundTrackerFrp.outputs.maxWound,
            (sbs, wm) => {
                const bonus:CS.AttributeBonus = {
                    type: "bonus",
                    bonus: (0 - wm),
                };
                return [
                    {
                        type: "aptitude",
                        filter: {},
                        effect: bonus,
                        reason: "Wound Modifier",
                    } as CS.AptitudeBonus,
                    ... sbs,
                ];
            },
        );

        lightArmor.loop(
            input.sheet.lift(bonuses, (cs, bs) => {
                return bs.reduce(
                    (acc, b) => {
                        if (b.type === "light_armor") {
                            return acc + b.bonus;
                        } else {
                            return acc;
                        }
                    },
                    cs.lightArmor,
                );
            }),
        );

        const wireTDI = (traitName:string) => {
            return wireTraitDisplayInput(input.sheet, traitName, bonuses);
        };

        const traitCells: TraitsFrp = {
            Deftness: wireTDI("Deftness"),
            Nimbleness: wireTDI("Nimbleness"),
            Quickness: wireTDI("Quickness"),
            Strength: wireTDI("Strength"),
            Vigor: wireTDI("Vigor"),
            Cognition: wireTDI("Cognition"),
            Knowledge: wireTDI("Knowledge"),
            Mien: wireTDI("Mien"),
            Smarts: wireTDI("Smarts"),
            Spirit: wireTDI("Spirit"),
        };

        return {
            input,
            internal: {
                traitCells,
                woundTrackerFrp,
                spellEffectsFrp,
            },
        };
    });
}

export interface CharacterSheetProps {
    frp: CharacterSheetFrp;
}

export interface CharacterSheetState {
}

export class CharacterSheet extends React.Component<CharacterSheetProps, CharacterSheetState> {
    render() {
        const { frp } = this.props;
        const { } = this.state;

        return <div className="character-sheet">
            <div className="traits">
                <h2>Traits &amp; Aptitudes</h2>
                <ul>
                { Object.keys(frp.internal.traitCells).map((k) => {
                    return <TraitDisplay
                            key={k}
                            traitName={k}
                            frp={wireTraitDisplayFrp(frp.internal.traitCells[k])}
                    />;
                })}
                </ul>
            </div>
            <div className="effects">
                <div className="info">
                    <h2>Sister Gabriela</h2>
                    <img src={St_TeresaJpg} width="125" />
                    <p><b>Occupation</b><br />Catholic Nun</p>
                    <p><b>Home Town</b><br />Paso del Norte, México</p>
                    <p><b>Age</b><br />42</p>
                </div>
                <WoundTracker frp={frp.internal.woundTrackerFrp} />
            </div>
            <div className="spells">
                <SpellEffects frp={frp.internal.spellEffectsFrp} />
            </div>
        </div>;
    }
}

ReactDOM.render(
    <CharacterSheet frp={wireCharacterSheetFrp({ sheet: new Cell(CS.gabriela) })} />,
    document.getElementById('app'),
);
