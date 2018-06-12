import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { Wound } from '../WoundTracker';
import { AptitudeKey, Bonus, applyAptitudeBonuses, bonusApplies } from '../Model';
import { DiceSet } from '../DiceSet';

export interface PureAptitudeInput {
    key: AptitudeKey;
    aptitudeDiceSet: Cell<DiceSet>;
    bonuses: Cell<Bonus[]>;
}

export interface PureAptitudeInternal {
    diceSet: Cell<DiceSet>;
}

export interface PureAptitudeOutput {
}

export interface PureAptitudeFrp {
    input: PureAptitudeInput;
    internal: PureAptitudeInternal;
    output: PureAptitudeOutput;
}

export function wirePureAptitudeFrp(input:PureAptitudeInput): PureAptitudeFrp {
    const diceSet = input.aptitudeDiceSet.lift(input.bonuses, applyAptitudeBonuses);
    return {
        input,
        output: {},
        internal: {
            diceSet,
        },
    };
}

export interface PureAptitudeProps {
    frp: PureAptitudeFrp;
}

export interface PureAptitudeState {
    diceSet: DiceSet;
}

export class PureAptitude extends React.Component<PureAptitudeProps, PureAptitudeState> {
    constructor(props:PureAptitudeProps) {
        super(props);
        this.state = {
            diceSet: props.frp.internal.diceSet.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.internal.diceSet.listen((diceSet) => {
            this.setState({ diceSet });
        });
    }

    public shouldComponentUpdate(
        newProps: PureAptitudeProps,
        newState: PureAptitudeState,
    ): boolean {
        return this.state.diceSet !== newState.diceSet;
    }

    public render() {
        const { frp } = this.props;
        const { diceSet } = this.state;

        return <li className="pure-aptitude">
            <span className="name">{frp.input.key.aptitudeName}</span>
            <span className="value">{diceSet.toString()}</span>
        </li>;
    }

}
