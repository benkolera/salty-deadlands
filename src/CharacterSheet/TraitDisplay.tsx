import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from "lodash";
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import {
    Bonus, bonusApplies, CharacterSheet, Trait, Aptitude, AptitudeWithConcentrations,
    PureAptitude, Traits, AptitudeFilter, AptitudeKey, applyAptitudeBonuses,
} from "./Model";
import { DiceSet } from './DiceSet';
import {
    PureAptitude as PureAptitudeC, PureAptitudeFrp as PureAptitudeCFrp, wirePureAptitudeFrp,
} from "./TraitDisplay/PureAptitude";
import { Wound } from "./WoundTracker";
import {
    Concentrations, ConcentrationsFrp, wireConcentrationsFrp,
} from './TraitDisplay/Concentrations';
import { leftmost } from "./Utils";
import { DiceCodeCopy, wireDiceCodeCopyFrp, DiceCodeCopyFrp, DiceCodeType } from './DiceCodeCopy';

/*
The Job of this component is to take all current bonuses, a trait and present the current dice sets
for the aptitudes and traits.
*/

export interface PureAptitudeFrp {
    type: "pure";
    value: PureAptitudeCFrp;
}

export interface AptitudeWithConcentrationsFrp {
    type: "concentrated";
    concentrationsFrp: ConcentrationsFrp;
}

export type AptitudeFrp = PureAptitudeFrp | AptitudeWithConcentrationsFrp;

// This is undoubedly the worst function in the app
function wireAptitudeFrp(
    traitName: string,
    thisKey:string,
    traitDiceSet: Cell<DiceSet>,
    traitBonuses: Cell<Bonus[]>,
    aptitudeCell:Cell<Aptitude>,
    a: Aptitude,
):AptitudeFrp {
    const mkKey = (aptitudeName:string, concentrationName?:string):AptitudeKey => {
        return { traitName, aptitudeName, concentrationName };
    };
    if (a.type === "pure") {
        const key = mkKey(thisKey);
        return {
            type: "pure",
            value: wirePureAptitudeFrp({
                key,
                aptitudeDiceSet: traitDiceSet.map(ds => ds.clone({ num: a.value })) ,
                bonuses: traitBonuses.map(x => x.filter(bonusApplies(key))),
            }),
        };
    } else if (a.type === "concentrated") {
        return {
            type: "concentrated",
            concentrationsFrp: wireConcentrationsFrp({
                concentrations: aptitudeCell.map((x) => {
                    const ca = x as AptitudeWithConcentrations;

                    return Object.keys(ca.concentrations).reduce(
                        (out: { [key: string]: AptitudeFrp }, pKey: string) => {
                            const key = mkKey(pKey, thisKey);
                            const cv  = ca.concentrations[pKey];

                            const pureAptitudeCell = aptitudeCell.map((x) => {
                                return (x as AptitudeWithConcentrations).concentrations[pKey].value;
                            });
                            return {
                                ...out,
                                [pKey]: wirePureAptitudeFrp({
                                    key,
                                    aptitudeDiceSet: traitDiceSet.map((ds) => {
                                        return ds.clone({ num: cv.value });
                                    }),
                                    bonuses: traitBonuses.map(x => x.filter(bonusApplies(key))),
                                }),
                            };
                        },
                        {},
                    );
                }),
            }),
        };
    } else {
        // :(
        return ({} as AptitudeFrp);
    }
}

export interface TraitDisplayInput {
    trait: Cell<Trait>;
    traitName: string;
    bonuses: Cell<Bonus[]>;
}

type AptitudesFrp = { [x:string]:AptitudeFrp };

export interface TraitDisplayInternal {
    diceCodeCopyFrp: DiceCodeCopyFrp;
}

export interface TraitDisplayOutput {
    diceSet: Cell<DiceSet>;
    aptitudes: Cell<AptitudesFrp>;
}

export interface TraitDisplayFrp {
    input: TraitDisplayInput;
    internal: TraitDisplayInternal;
    output: TraitDisplayOutput;
}

export function wireTraitDisplayInput(
    sheetCell: Cell<CharacterSheet>,
    traitName: string,
    allBonuses: Cell<Bonus[]>,
): TraitDisplayInput {
    return {
        traitName,
        trait: sheetCell.map(s => s.traits[traitName]),
        bonuses: allBonuses.map(x => x.filter(bonusApplies({ traitName }))),
    };
}

export function wireTraitDisplayFrp(input: TraitDisplayInput): TraitDisplayFrp {
    const aptitudes:Cell<AptitudesFrp> = input.trait.lift(
        input.bonuses,
        (t, bs) => {
            // TODO: Should have a helper. figure out why
            // sodium-frp-react.splitRecord doesn't work for
            // these (doesn't type check).
            return Object.keys(t.aptitudes).reduce(
                (out: {[key:string]:AptitudeFrp}, key:string) => {
                    const aptitude = t.aptitudes[key];

                    const aptitudeCell = input.trait.map(t => t.aptitudes[key]);

                    return { ...out, [key]: wireAptitudeFrp(
                        input.traitName,
                        key,
                        input.trait.map(x => x.diceSet),
                        input.bonuses,
                        aptitudeCell,
                        aptitude,
                    )};
                },
                {},
            );
        },
    );

    const diceSet = input.trait.lift(input.bonuses, (t, bs) => {
        const out = applyAptitudeBonuses(
            t.diceSet,
            bs.filter(bonusApplies({
                traitName: input.traitName,
                aptitudeName: null,
                concentrationName: null,
            })),
        );
        return out;
    });

    const diceCodeTypes:DiceCodeType[] = input.traitName === "Strength"
        ? ["damage", "normal", "untrained"]
        : ["normal", "untrained"];
    const diceCodeCopyFrp = wireDiceCodeCopyFrp({ diceSet, diceCodeTypes });

    return {
        input,
        output: {
            diceSet,
            aptitudes,
        },
        internal: {
            diceCodeCopyFrp,
        },
    };
}

export interface TraitDisplayProps {
    frp: TraitDisplayFrp;
    traitName: string;
}

export interface TraitDisplayState {
    diceSet: DiceSet;
    aptitudes: { [key:string]: AptitudeFrp };
}

export class TraitDisplay extends React.Component<TraitDisplayProps, TraitDisplayState> {
    constructor(props:TraitDisplayProps) {
        super(props);
        this.state = {
            diceSet: this.props.frp.output.diceSet.sample(),
            aptitudes: this.props.frp.output.aptitudes.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.output.diceSet.listen((diceSet) => {
            this.setState({ diceSet });
        });
        this.props.frp.output.aptitudes.listen((aptitudes) => {
            this.setState({ aptitudes });
        });
    }

    public shouldComponentUpdate(newProps: TraitDisplayProps, newState: TraitDisplayState):boolean {
        return (
            this.state.diceSet !== newState.diceSet ||
            this.state.aptitudes !== newState.aptitudes
        );
    }

    public render() {
        const { traitName } = this.props;
        const { diceSet, aptitudes } = this.state;

        return <li className="trait">
            <span className="trait-name">{traitName}</span>
            <span className="trait-dice">
                {diceSet.toString()}
                <DiceCodeCopy frp={this.props.frp.internal.diceCodeCopyFrp} />
            </span>
            <ul className="aptitudes">
                {Object.keys(aptitudes).map((k) => {
                    const v = aptitudes[k];
                    if (v.type === "pure") {
                        return (
                            <PureAptitudeC key={k} frp={v.value} />
                        );
                    } else if (v.type === "concentrated") {
                        return <li key={k}>
                            {k}
                            <Concentrations frp={v.concentrationsFrp} />
                        </li>;
                    } else {
                        return <div key={k}></div>;
                    }
                })}
            </ul>
        </li>;
    }

    private onChange(e: React.ChangeEvent<HTMLInputElement>):void {
    }
}
