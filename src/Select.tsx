import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';

/*
* This component makes a TS sodium & react powered select box
*/

// Internally, we need to keep hold of when the actual input changes
export interface SelectInternal {
    inputChanges: StreamSink<string>;
}

export type SelectOptions<A> = {[id:string]: A};

// Our parent will give us a cell of what options it expects to be in the select
// The output of this component is a Cell that contains the value that has been
// selected.
export interface SelectFrp<A> {
    input: Cell<SelectOptions<A>>;
    internal: SelectInternal;
    output: Cell<A>;
}

// We wire up our FRP graph for this component by taking our options and the
// value that should be selected on initialisation.
export function wireSelectFrp<A>(initValue: A, input: Cell<SelectOptions<A>>): SelectFrp<A> {
    // Lets create a stream sink that we'll connect to the DOM events
    const inputChanges = new StreamSink<string>();

    // Every time the select box change, look up the option that we should return 
    // and then output it to the cell.
    const output = inputChanges.snapshot(input, (i, options) => {
        return options[i];
    }).hold(initValue); // Initialise it to the parent supplied init value

    return {
        input,
        output,
        internal: {
            inputChanges,
        },
    };
}

// Classname not being a cell means that it'll be static
// always and outside of our FRP. In this case this works,
// but may not always work.
export interface SelectProps<A> {
    frp: SelectFrp<A>;
    className?: string;
}

// Our state is the unwrapped input cell
export interface SelectState<A> {
    options: SelectOptions<A>;
}

export class Select<A> extends React.Component<SelectProps<A>, SelectState<A>> {
    constructor(props:SelectProps<A>) {
        super(props);
        this.state = {
            options: props.frp.input.sample(),
        };
    }

    // On component mount, setup the listener to the input
    // and to set it into our state when it changes.
    public componentDidMount() {
        this.props.frp.input.listen((options) => {
            this.setState({ options });
        });
    }

    // As a speed boost, only rerender if our options changed.
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

    // Our DOM callback sends an event onto a sodium stream now. Neat!
    private onChange(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.inputChanges.send(e.target.value);
    }
}
