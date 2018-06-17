import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit } from 'sodiumjs';
import { Wound } from '../WoundTracker';
import { AptitudeKey, Bonus, bonusApplies, EffectSet, Effect } from '../Model';
import { DiceSet } from '../DiceSet';
import { SpellEffect, wireSpellEffectFrp, SpellEffectFrp } from './SpellEffect';

/*
This presents a list of effects, using the SpellEffect component for every effect
*/

// Pretty standard inputs and outputs
export interface SpellEffectSectionInput {
    effectSet: Cell<EffectSet>;
    roundProgressed: Stream<Unit>;
    combatEnded: Stream<Unit>;
}

export interface SpellEffectSectionInternal {
    spellEffectFrps: Cell<{[id:string]: SpellEffectFrp}>;
}

export interface SpellEffectSectionOutput {
    bonuses: Cell<Bonus[]>;
}

export interface SpellEffectSectionFrp {
    input: SpellEffectSectionInput;
    internal: SpellEffectSectionInternal;
    output: SpellEffectSectionOutput;
}

// And here is where shit gets weird...
export function wireSpellEffectSectionFrp(input:SpellEffectSectionInput): SpellEffectSectionFrp {
    const spellEffectFrps: Cell<{[id:string]: SpellEffectFrp}> = input.effectSet.map((es) => {
        return Object.keys(es).reduce(
            (out: {[key:string]: SpellEffectFrp}, key: string) => {
                const effect = input.effectSet.map(es => es[key]);
                return { ...out, [key]: wireSpellEffectFrp({
                    effect,
                    roundProgressed: input.roundProgressed,
                    combatEnded: input.combatEnded,
                }) };
            },
            {},
        );
    });

    const bonuses: Cell<Bonus[]> = spellEffectFrps["fantasy-land/chain"]((es) => {
        const cells: Cell<Bonus | null>[] = Object.keys(es).map((k) => {
            return es[k].output.bonus;
        });
        /// Lol, what I wouldn't give for sequence right now...
        // TODO: Figure out how to make this work with fantasy land
        return cells.reduce(
            (acc: Cell<Bonus[]>, c:Cell<Bonus | null>) => {
                return acc.lift(
                    c,
                    (accArr:Bonus[], v:Bonus | null):Bonus[] => {
                        return v !== null ? accArr.concat(v) : accArr;
                    },
                );
            },
            new Cell<Bonus[]>([]),
        );
    });

    return {
        input,
        output: {
            bonuses,
        },
        internal: {
            spellEffectFrps,
        },
    };
}

export interface SpellEffectSectionProps {
    frp: SpellEffectSectionFrp;
    name: string;
}

export interface SpellEffectSectionState {
    spellEffectFrps: {[key:string]:SpellEffectFrp};
}

export class SpellEffectSection
    extends React.Component<SpellEffectSectionProps, SpellEffectSectionState>
{
    constructor(props:SpellEffectSectionProps) {
        super(props);
        this.state = {
            spellEffectFrps: props.frp.internal.spellEffectFrps.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.internal.spellEffectFrps.listen((spellEffectFrps) => {
            this.setState({ spellEffectFrps });
        });
    }

    public shouldComponentUpdate(
        newProps: SpellEffectSectionProps,
        newState: SpellEffectSectionState,
    ): boolean {
        return this.state.spellEffectFrps !== newState.spellEffectFrps;
    }

    public render() {
        const { frp, name } = this.props;
        const { spellEffectFrps } = this.state;

        return <div className="effects-section">
            <h2>{name}</h2>
            {Object.keys(spellEffectFrps).map((k) => {
                const e = spellEffectFrps[k];
                return <SpellEffect key={k} name={k} frp={e} />;
            })}
        </div>;
    }

}
