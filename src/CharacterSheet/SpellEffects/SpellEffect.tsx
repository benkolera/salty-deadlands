import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { Bonus, bonusApplies, EffectSet, Effect } from '../Model';
import {
    SpellEffectSection, SpellEffectSectionFrp, wireSpellEffectSectionFrp,
} from "./SpellEffectSection";
import { DiceSet } from '../DiceSet';
import { NumberInput, NumberInputFrp, wireNumberInputFrp } from '../../NumberInput';

/*
This component manages drawing a single effect, including a form and a button
if the effect actually is a spell bonus that needs some input.
*/

// The effect is our input
export interface SpellEffectInput {
    effect: Cell<Effect>;
}

// Internally, we need to keep track of:
//   spellInput: the state of the number input box we use if it is a spell
//   toggle: an stream of events from the form button
//   activated: whether this is on or off
export interface SpellEffectInternal {
    spellInput: NumberInputFrp;
    toggle: StreamSink<Unit>;
    activated: Cell<boolean>;
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

export function wireSpellEffectFrp(input:SpellEffectInput): SpellEffectFrp {
    const spellInput = wireNumberInputFrp();
    const activated = new CellLoop<boolean>();
    const toggle = new StreamSink<Unit>();
    activated.loop(
        toggle.snapshot(activated, (u, a) => !a).hold(false),
    );

    // Whether we output a bonus or not depends on the type
    // and whether the effect is activated (if it is a spell).
    const bonus = activated.lift3(
        spellInput.output,
        input.effect,
        (a, v, e) => {
            if (e.type === "spell" && a) {
                return e.bonusFunc(v);
            } else if (e.type === "passive") {
                return e.bonus;
            } else {
                return null;
            }
        },
    );

    return {
        input,
        output: {
            bonus,
        },
        internal: {
            toggle,
            activated,
            spellInput,
        },
    };
}

export interface SpellEffectProps {
    frp: SpellEffectFrp;
    name: string;
}

export interface SpellEffectState {
    effect: Effect;
    activated: boolean;
}

export class SpellEffect extends React.Component<SpellEffectProps, SpellEffectState> {
    constructor(props:SpellEffectProps) {
        super(props);
        this.state = {
            effect: props.frp.input.effect.sample(),
            activated: props.frp.internal.activated.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.input.effect.listen((effect) => {
            return this.setState({ effect });
        });
        this.props.frp.internal.activated.listen((activated) => {
            return this.setState({ activated });
        });
    }

    public shouldComponentUpdate(
        newProps: SpellEffectProps,
        newState: SpellEffectState,
    ): boolean {
        return this.state.effect !== newState.effect || this.state.activated !== newState.activated;
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
        const { effect, activated } = this.state;

        return <div className="effect">
            <p>{name} {this.humanizeType(effect.type)}</p>
            {effect.desc !== undefined ?
                <p className="effect-desc">{effect.desc}</p> :
                <span></span>
            }
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
                    </div>
                ) :
                <div />
            }
        </div>;
    }

    private onActivate(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.toggle.send(Unit);
    }

}
