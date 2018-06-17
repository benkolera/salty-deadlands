import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
    Cell, StreamLoop, StreamSink, Stream, CellLoop, Transaction, Unit, Operational,
} from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { Bonus, bonusApplies, EffectSet, Effect } from '../Model';
import {
    SpellEffectSection, SpellEffectSectionFrp, wireSpellEffectSectionFrp,
} from "./SpellEffectSection";
import { DiceSet } from '../DiceSet';
import { NumberInput, NumberInputFrp, wireNumberInputFrp } from '../../NumberInput';
import { leftmost } from "../Utils";

/*
This component manages drawing a single effect, including a form and a button
if the effect actually is a spell bonus that needs some input.
*/

// The effect is our input
export interface SpellEffectInput {
    effect: Cell<Effect>;
    roundProgressed: Stream<Unit>;
    combatEnded: Stream<Unit>;
}

// Internally, we need to keep track of:
//   spellInput: the state of the number input box we use if it is a spell
//   toggle: an stream of events from the form button
//   roundsActive: how many rounds is this active for
//   activated: whether this is on or not
export interface SpellEffectInternal {
    spellInput: NumberInputFrp;
    toggle: StreamSink<Unit>;
    roundsRemaining: Cell<number>;
    toggleText: StreamSink<Unit>;
    showText: Cell<boolean>;
}

// And we output either a bonus or null
export interface SpellEffectOutput {
    bonus: Cell<Bonus | null>;
}

export interface SpellEffectFrp {
    input: SpellEffectInput;
    internal: SpellEffectInternal;
    output: SpellEffectOutput;
}

type ActivatedUpdater = (a:boolean) => boolean;
type RoundsUpdater = (r:number, e:Effect) => number;

export function wireSpellEffectFrp(input:SpellEffectInput): SpellEffectFrp {
    const reset = new StreamLoop<Unit>();
    const spellInput = wireNumberInputFrp(reset.mapTo(undefined));

    const roundsRemaining = new CellLoop<number>();
    const toggle = new StreamSink<Unit>();

    const toggleRounds = toggle.snapshot(roundsRemaining, (u, a) => a).map<RoundsUpdater>(
        oldR => (r, e) => {
            if (oldR === 0 && e.type === "spell") {
                return e.duration;
            } else {
                return 0;
            }
        },
    );
    const resetRounds = input.combatEnded.mapTo<RoundsUpdater>((r, e) => 0);
    const decRounds = input.roundProgressed.mapTo<RoundsUpdater>((r, e) => Math.max(0, r - 1));

    roundsRemaining.loop(
        leftmost(toggleRounds, resetRounds, decRounds).snapshot3(
            input.effect, roundsRemaining, (f, e, r) =>  f(r, e),
        ).hold(0),
    );

    reset.loop(Operational.updates(roundsRemaining).filter((x) => {
        return x === 0;
    }));

    // Whether we output a bonus or not depends on the type
    // and whether the effect is activated (if it is a spell).
    const bonus = roundsRemaining.lift3(
        spellInput.output,
        input.effect,
        (r, v, e) => {
            if (e.type === "spell" && r > 0) {
                return e.bonusFunc(v);
            } else if (e.type === "passive") {
                return e.bonus;
            } else {
                return null;
            }
        },
    );

    const toggleText = new StreamSink<Unit>();
    const showText = new CellLoop<boolean>();
    showText.loop(
        toggleText.snapshot(showText, (u, s) => !s).hold(false),
    );

    return {
        input,
        output: {
            bonus,
        },
        internal: {
            toggle,
            toggleText,
            showText,
            spellInput,
            roundsRemaining,
        },
    };
}

export interface SpellEffectProps {
    frp: SpellEffectFrp;
    name: string;
}

export interface SpellEffectState {
    effect: Effect;
    roundsRemaining: number;
    showText: boolean;
}

export class SpellEffect extends React.Component<SpellEffectProps, SpellEffectState> {
    constructor(props:SpellEffectProps) {
        super(props);
        this.state = {
            effect: props.frp.input.effect.sample(),
            roundsRemaining: props.frp.internal.roundsRemaining.sample(),
            showText: props.frp.internal.showText.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.input.effect.listen((effect) => {
            return this.setState({ effect });
        });
        this.props.frp.internal.roundsRemaining.listen((roundsRemaining) => {
            return this.setState({ roundsRemaining });
        });
        this.props.frp.internal.showText.listen((showText) => {
            return this.setState({ showText });
        });
    }

    humanizeType(t:string) {
        if (t === "passive") {
            return "(Passive)";
        } else {
            return "";
        }
    }

    public render() {
        const { frp, name } = this.props;
        const { effect, roundsRemaining, showText } = this.state;

        const activated = roundsRemaining > 0;
        const hasDesc = effect.desc !== undefined && effect.desc.length > 0;

        // tslint:disable:no-trailing-whitespace
        return <div className="effect">
            <div>
                <span className="name">{name}</span>
                {this.humanizeType(effect.type)}: 
                <span className="short-desc">{effect.shortDesc}</span>
                { hasDesc
                    ? <button className="toggle-desc" onClick={this.onToggleDesc.bind(this)}>
                        { showText ? "Hide" : "Expand" }
                    </button>
                    : <span />
                }
            </div>
            {effect.type === "spell" ?
                (
                    <div className="spell-form">
                        <NumberInput
                            frp={frp.internal.spellInput}
                            placeholder={effect.spellInputDesc}
                            />
                        <button onClick={this.onActivate.bind(this)}>
                            { activated ? "Deactivate" : "Activate" }
                        </button>
                        {(activated)
                            ? <span className="active-rounds">
                                Active for {roundsRemaining} rounds.
                              </span>
                            : <span />
                        }
                    </div>
                ) :
                <div />
            }
            {effect.desc !== undefined && showText
                ? <div className="effect-desc">
                    {effect.desc.map((e, i) => {
                        return <p key={i}>{e}</p>;
                    })}
                </div>
                : <span></span>
            }
        </div>;
        // tslint:enable:no-trailing-whitespace
    }

    private onActivate(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.toggle.send(Unit);
    }

    private onToggleDesc(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.toggleText.send(Unit);
    }

}
