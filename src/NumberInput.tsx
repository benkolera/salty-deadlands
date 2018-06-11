import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';

export interface NumberInputInternal {
    inputChanges: StreamSink<number>;
}

export interface NumberInputFrp {
    internal: NumberInputInternal;
    output: Cell<number>;
}

export function wireNumberInputFrp(): NumberInputFrp {
    const inputChanges = new StreamSink<number>();
    const output = inputChanges.hold(0);

    return {
        output,
        internal: {
            inputChanges,
        },
    };
}

export interface NumberInputProps {
    frp: NumberInputFrp;
    placeholder: string;
    className?: string;
}

export interface NumberInputState {

}

export class NumberInput extends React.Component<NumberInputProps, NumberInputState> {
    constructor(props:NumberInputProps) {
        super(props);
        this.state = {
        };
    }

    public componentDidMount() {
    }

    public render() {
        const { placeholder, className } = this.props;

        return <input
            type="number"
            placeholder={placeholder}
            className={className}
            onChange={this.onChange.bind(this)}
            />;
    }

    private onChange(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.inputChanges.send(e.target.valueAsNumber);
    }
}
