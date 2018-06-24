import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit, Operational } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDice, faCopy } from '@fortawesome/fontawesome-pro-light';

import { DiceSet } from './DiceSet';
import { NumberInput, NumberInputFrp, wireNumberInputFrp } from '../NumberInput';
import { Clipboard, wireClipboardFrp, ClipboardFrp } from './Clipboard';

export interface DiceCodeCopyInput {
    diceSet: Cell<DiceSet>;
}

export interface DiceCodeCopyInternal {
    doCopy: StreamSink<Unit>;
    numberInput: NumberInputFrp;
    clipboardFrp: ClipboardFrp;
    toggleUntrained: StreamSink<Unit>;
    untrained: Cell<boolean>;
}

export interface DiceCodeCopyOutput {
}

export interface DiceCodeCopyFrp {
    input: DiceCodeCopyInput;
    internal: DiceCodeCopyInternal;
    output: DiceCodeCopyOutput;
}

export function wireDiceCodeCopyFrp(input:DiceCodeCopyInput): DiceCodeCopyFrp {
    const doCopy = new StreamSink<Unit>();
    const toggleUntrained = new StreamSink<Unit>();
    const setNumber = new StreamSink<number | undefined>();
    const numberInput = wireNumberInputFrp({ setInput: setNumber, initialValue: 5 });
    const untrained = new CellLoop<boolean>();
    untrained.loop(
        toggleUntrained.snapshot(untrained, (unit, untrained) => !untrained).hold(false),
    );

    const diceText = numberInput.output.lift3(input.diceSet, untrained, (tn, ds, u) => {
        const d = u ? ds.clone({ num: 1, bonus: ds.bonus - 4 }) : ds;
        return "/die " + d.toFgCode({ tn, sum: false, raises: true });
    });

    const clipboardFrp = wireClipboardFrp({
        doCopy,
        inputText: diceText,
    });

    return {
        input,
        output: {
        },
        internal: {
            numberInput,
            doCopy,
            clipboardFrp,
            toggleUntrained,
            untrained,
        },
    };
}

export interface DiceCodeCopyProps {
    frp: DiceCodeCopyFrp;
    type: "trait" | "aptitude";
}

export interface DiceCodeCopyState {
    diceSet: DiceSet;
    opened: boolean;
}

export class DiceCodeCopy extends React.Component<DiceCodeCopyProps, DiceCodeCopyState> {
    protected textInput: HTMLInputElement | null = null;
    constructor(props:DiceCodeCopyProps) {
        super(props);
        this.state = {
            diceSet: props.frp.input.diceSet.sample(),
            opened: false,
        };
    }

    public componentDidMount() {
        this.props.frp.input.diceSet.listen((diceSet) => {
            this.setState({ diceSet });
        });
    }

    public render() {
        const { frp, type } = this.props;
        const { opened } = this.state;

        return <div className="dicecode-container">
            <span onClick={this.openModal.bind(this)}>
                <FontAwesomeIcon icon={ faDice } />
            </span>
            <div className={"modal" + (opened ? " opened" : "")}>
                <div className="modal-content">
                    <label>TN:
                        <NumberInput className="dicecode-tn" frp={frp.internal.numberInput} />
                    </label>
                    { type === "trait"
                     ? <label className="untrained" >Untrained?
                         <input type="checkbox" onChange={this.onToggleUntrained.bind(this)} />
                     </label>
                     : <></>
                     }
                    <Clipboard display="inline" frp={ frp.internal.clipboardFrp } />
                    <span onClick={this.onClick.bind(this)}>
                        <FontAwesomeIcon icon={ faCopy } />
                    </span>
                </div>
            </div>
        </div>;

    }

    openModal():void {
        this.setState({
            opened: true,
        });
    }

    onToggleUntrained():void {
        this.props.frp.internal.toggleUntrained.send(Unit);
    }

    onClick():void {
        this.setState({ opened: false });
        this.props.frp.internal.doCopy.send(Unit);
    }

}
