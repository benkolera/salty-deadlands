import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit, Operational } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';

/*
 * This just has an input that is hidden off the page to be able to copy to the
 * clipboard based on an incoming stream.
*/

export interface ClipboardInput {
    inputText: Cell<string>;
    doCopy: Stream<Unit>;
}

export interface ClipboardInternal {
}

// And we output either a bonus or null
export interface ClipboardOutput {
}

export interface ClipboardFrp {
    input: ClipboardInput;
    internal: ClipboardInternal;
    output: ClipboardOutput;
}

export function wireClipboardFrp(input:ClipboardInput): ClipboardFrp {
    return {
        input,
        output: {
        },
        internal: {
        },
    };
}

export interface ClipboardProps {
    frp: ClipboardFrp;
    display: "inline" | "hidden";
}

export interface ClipboardState {
    value: string;
}

export class Clipboard extends React.Component<ClipboardProps, ClipboardState> {
    protected textInput: HTMLInputElement | null = null;
    constructor(props:ClipboardProps) {
        super(props);
        this.state = {
            value: this.props.frp.input.inputText.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.input.inputText.listen((value) => {
            this.setState({ value });
        });
        this.props.frp.input.doCopy.listen((u) => {
            if (this.textInput) {
                this.textInput.select();
                document.execCommand("copy");
            }
        });
    }

    public render() {
        const { display } = this.props;
        const { value } = this.state;

        return <input
            className={"copypasta " + display}
            value={ value }
            readOnly={true}
            ref={ref => this.textInput = ref}
            >
        </input>;
    }

}
