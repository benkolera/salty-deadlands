import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { leftmost } from './CharacterSheet/Utils';

export interface NumberInputInternal {
    inputChanges: StreamSink<number>;
}

export interface NumberInputFrp {
    input: Stream<number | undefined>;
    internal: NumberInputInternal;
    output: Cell<number>;
}

export function wireNumberInputFrp(setInput: Stream<number | undefined>): NumberInputFrp {
    const inputChanges = new StreamSink<number>();
    const output = inputChanges.hold(0);

    return {
        output,
        input: setInput,
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
    input: HTMLInputElement | null;

    constructor(props:NumberInputProps) {
        super(props);
        this.input = null;
        this.state = {
        };
    }

    public componentDidMount() {
        this.props.frp.input.listen((value) => {
            if (this.input) {
                this.input.value = (value ? value.toString() : "");
            }
        });
    }

    public render() {
        const { placeholder, className } = this.props;
        const { } = this.state;

        return <input
            type="number"
            placeholder={placeholder}
            className={className}
            ref={input => this.input = input}
            onChange={this.onChange.bind(this)}
            />;
    }

    private onChange(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.inputChanges.send(e.target.valueAsNumber);
    }
}
