
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit, Operational } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';

/*
This component tracks whether we're in combat, progressing turns etc.
*/

export interface TurnTrackerInput {
}

export interface TurnTrackerInternal {
    toggleCombat: StreamSink<Unit>;
    progressRound: StreamSink<Unit>;
}

// And we output either a bonus or null
export interface TurnTrackerOutput {
    inCombat: Cell<boolean>;
    round: Cell<number>;
    combatEnded: Stream<Unit>;
    roundProgressed: Stream<Unit>;
}

export interface TurnTrackerFrp {
    input: TurnTrackerInput;
    internal: TurnTrackerInternal;
    output: TurnTrackerOutput;
}

type RoundProgressor = (n:number) => number;

export function wireTurnTrackerFrp(input:TurnTrackerInput): TurnTrackerFrp {
    const toggleCombat = new StreamSink<Unit>();
    const progressRound = new StreamSink<Unit>();

    const inCombat = new CellLoop<boolean>();
    inCombat.loop(toggleCombat.snapshot(inCombat, (u, i) => !i).hold(false));
    const round    = new CellLoop<number>();
    const roundActions:Stream<RoundProgressor> =
        toggleCombat.mapTo<RoundProgressor>(r => 1).merge(
            progressRound.mapTo<RoundProgressor>(r => r + 1),
            (r, i) => r,
        );
    round.loop(
        roundActions.snapshot(
            round,
            (f, r) => f(r),
        ).hold(1),
    );

    const combatEnded = Operational.updates(inCombat).filter(i => !i);

    return {
        input,
        output: {
            inCombat,
            round,
            combatEnded,
            roundProgressed: progressRound,
        },
        internal: {
            toggleCombat,
            progressRound,
        },
    };
}

export interface TurnTrackerProps {
    frp: TurnTrackerFrp;
}

export interface TurnTrackerState {
    round: number;
    inCombat: boolean;
}

export class TurnTracker extends React.Component<TurnTrackerProps, TurnTrackerState> {
    constructor(props:TurnTrackerProps) {
        super(props);
        this.state = {
            round: this.props.frp.output.round.sample(),
            inCombat: this.props.frp.output.inCombat.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.output.round.listen((round) => {
            return this.setState({ round });
        });
        this.props.frp.output.inCombat.listen((inCombat) => {
            return this.setState({ inCombat });
        });
    }

    public render() {
        const { } = this.props;
        const { round, inCombat } = this.state;

        return <div className="turn-tracker">
            <button onClick={this.onToggle.bind(this)}>{inCombat ? "End" : "Start"} Combat</button>
            { inCombat
                ? <div>
                        <span>Round: {round} </span>
                        <button onClick={this.onProgressRound.bind(this)}>
                            Next Round
                        </button>
                   </div>
                : <div />
            }
        </div>;
    }

    private onToggle(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.toggleCombat.send(Unit);
    }

    private onProgressRound(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.progressRound.send(Unit);
    }

}
