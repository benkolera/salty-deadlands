import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';

export interface SelectInternal {
    inputChanges: StreamSink<string>;
}

export type SelectOptions<A> = {[id:string]: A};

export interface SelectFrp<A> {
    input: Cell<SelectOptions<A>>;
    internal: SelectInternal;
    output: Cell<A>;
}

export function wireSelectFrp<A>(initValue: A, input: Cell<SelectOptions<A>>): SelectFrp<A> {
    const inputChanges = new StreamSink<string>();
    const output = inputChanges.snapshot(input, (i, options) => {
        return options[i];
    }).hold(initValue);

    return {
        input,
        output,
        internal: {
            inputChanges,
        },
    };
}

export interface SelectProps<A> {
    frp: SelectFrp<A>;
    className?: string;
}

export interface SelectState<A> {
    options: SelectOptions<A>;
}

export class Select<A> extends React.Component<SelectProps<A>, SelectState<A>> {
    constructor(props:SelectProps<A>) {
        super(props);
        this.state = {
            options: {},
        };
    }

    public componentDidMount() {
        this.props.frp.input.listen((options) => {
            this.setState({ options });
        });
    }

    public shouldComponentUpdate(nextProps: SelectProps<A>, nextState: SelectState<A>) {
        return this.state.options !== nextState.options;
    }

    public render() {
        const { className } = this.props;
        const { options }   = this.state;

        return <select
            className={className}
            onChange={this.onChange.bind(this)}
            >
            {Object.keys(options).map((k) => {
                return <option key={k} value={k}>{k}</option>;
            })}
            </select>;
    }

    private onChange(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.inputChanges.send(e.target.value);
    }
}
