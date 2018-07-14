import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit, Operational } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDice, faCopy } from '@fortawesome/fontawesome-pro-light';

import { DiceSet } from './DiceSet';
import { NumberInput, NumberInputFrp, wireNumberInputFrp } from '../NumberInput';
import { Clipboard, wireClipboardFrp, ClipboardFrp } from './Clipboard';

export type DiceCodeType = "normal" | "untrained" | "damage";

export interface DiceCodeCopyInput {
    diceSet: Cell<DiceSet>;
    diceCodeTypes: DiceCodeType[];
}

export interface DiceCodeCopyInternal {
    doCopy: StreamSink<DiceCodeType>;
    numberInput: NumberInputFrp;
    clipboardFrps: Record<DiceCodeType, ClipboardFrp>;
}

export interface DiceCodeCopyOutput {
}

export interface DiceCodeCopyFrp {
    input: DiceCodeCopyInput;
    internal: DiceCodeCopyInternal;
    output: DiceCodeCopyOutput;
}

export function wireDiceCodeCopyFrp(input:DiceCodeCopyInput): DiceCodeCopyFrp {
    const doCopy = new StreamSink<DiceCodeType>();
    const toggleUntrained = new StreamSink<Unit>();
    const setNumber = new StreamSink<number | undefined>();
    const numberInput = wireNumberInputFrp({ setInput: setNumber, initialValue: 5 });

    const clipboardFrps = input.diceCodeTypes.reduce(
        (acc, t) => {
            const diceText = numberInput.output.lift(input.diceSet, (tn, ds) => {
                const vsTn = { tn, sum: false, raises: true };
                switch (t) {
                case "untrained":
                    return ds.clone({ num: 1, bonus: ds.bonus - 4 }).toFgCode(vsTn);
                case "normal": return ds.toFgCode(vsTn);
                case "damage": return ds.toFgCode({ sum: true, raises: false });
                }
            });

            return {
                ...acc,
                [t]: wireClipboardFrp({
                    doCopy: doCopy.filter(x => x === t),
                    inputText: diceText,
                }),
            };
        },
        {} as Record<DiceCodeType, ClipboardFrp>,
    );

    return {
        input,
        output: {
        },
        internal: {
            numberInput,
            doCopy,
            clipboardFrps,
        },
    };
}
export interface DiceCodeCopyProps {
    frp: DiceCodeCopyFrp;
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
        const { frp } = this.props;
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
                    <ul>
                        {Object.keys(frp.internal.clipboardFrps).map((k:DiceCodeType) => {
                            return <li key={k}>
                                {k}:
                                <Clipboard display="inline" frp={frp.internal.clipboardFrps[k]} />
                                <span onClick={this.onClick.bind(this)(k)}>
                                    <FontAwesomeIcon icon={faCopy} />
                                </span>
                            </li>;
                        })}
                    </ul>
                </div>
            </div>
        </div>;

    }

    openModal():void {
        this.setState({
            opened: true,
        });
    }

    onClick(t: DiceCodeType): () => void {
        return () => {
            this.setState({ opened: false });
            this.props.frp.internal.doCopy.send(t);
        };
    }

}
