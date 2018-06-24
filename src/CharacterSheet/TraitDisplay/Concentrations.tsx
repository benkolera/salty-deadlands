import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Operational } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { PureAptitude, PureAptitudeFrp } from './PureAptitude';
import { leftmost } from "../Utils";

export interface ConcentrationsInput {
    concentrations: Cell<{[key:string]: PureAptitudeFrp}>;
}

export interface ConcentrationsInternal {
}

export interface ConcentrationsOutput {
}

export interface ConcentrationsFrp {
    input: ConcentrationsInput;
    internal: ConcentrationsInternal;
    output: ConcentrationsOutput;
}

export function wireConcentrationsFrp(input:ConcentrationsInput): ConcentrationsFrp {
    return {
        input,
        output: {
        },
        internal: {
        },
    };
}

export interface ConcentrationsProps {
    frp: ConcentrationsFrp;
}

export interface ConcentrationsState {
    concentrations: {[key:string]: PureAptitudeFrp};
}

export class Concentrations extends React.Component<ConcentrationsProps, ConcentrationsState> {
    constructor(props:ConcentrationsProps) {
        super(props);
        this.state = {
            concentrations: props.frp.input.concentrations.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.input.concentrations.listen((concentrations) => {
            this.setState({ concentrations });
        });
    }

    public shouldComponentUpdate(
        newProps: ConcentrationsProps,
        newState: ConcentrationsState,
    ): boolean {
        return this.state.concentrations !== newState.concentrations;
    }

    public render() {
        const { } = this.props;
        const { concentrations } = this.state;

        return <ul className="concentrations">
            {Object.keys(concentrations).map((k) => {
                const c = concentrations[k];
                return <PureAptitude key={k} frp={c} />;
            })}
        </ul>;
    }

}
