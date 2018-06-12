import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { clamp } from 'lodash';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';

import { NumberInput, NumberInputFrp, wireNumberInputFrp } from "../NumberInput";
import { Select, SelectFrp, SelectOptions, wireSelectFrp } from "../Select";

/*
The job of this component is to display wound info, take damage and output
the current wound modifier.
*/

export type Wound = 0 | 1 | 2 | 3 | 4 | 5;
export type WoundTarget = "head" | "larm" | "rarm" | "torso" | "lleg" | "rleg";
export type TargetedWoundChange = { target: WoundTarget, change: number };

function changeWound(c:number, w:Wound):Wound {
    return clamp(w + c, 0, 5) as Wound;
}

function woundToClass(prefix:string):((x:Wound) => string) {
    return (w: Wound) => {
        return prefix + " " + woundDesc(w);
    };
}

function woundDesc(w:Wound):string {
    switch (w) {
    case 0: return "";
    case 1: return "light";
    case 2: return "heavy";
    case 3: return "serious";
    case 4: return "critical";
    case 5: return "maimed";
    }
}

export interface Limb {
    readonly wound: Cell<Wound>;
    readonly cssClass: Cell<string>;
}

function wireLimb(baseCssClass:WoundTarget, change:Stream<TargetedWoundChange>) {
    return Transaction.run(() => {
        const wound = new CellLoop<Wound>();
        const ourChanges = change.filter(
            x => x.target === baseCssClass,
        ).map(
            x => x.change,
        );
        wound.loop(ourChanges.snapshot(wound, changeWound).hold(0));
        const cssClass = wound.map(woundToClass(baseCssClass));

        return { change, wound, cssClass };
    });
}

export interface WoundInputs {
    readonly size: Cell<number>;
    readonly lightArmor: Cell<number>;
}

export interface WoundInternal {
    readonly applyDamage: StreamSink<Unit>;
    readonly damageInput: NumberInputFrp;
    readonly selectFrp: SelectFrp<WoundTarget>;
    readonly head: Limb;
    readonly larm: Limb;
    readonly rarm: Limb;
    readonly torso: Limb;
    readonly lleg: Limb;
    readonly rleg: Limb;
}

export interface WoundOutputs {
    readonly maxWound: Cell<Wound>;
    readonly dead: Cell<boolean>;
}

export interface WoundTrackerFrp {
    readonly inputs:WoundInputs;
    readonly internal:WoundInternal;
    readonly outputs:WoundOutputs;
}

export function wireWoundTrackerFrp(inputs: WoundInputs): WoundTrackerFrp {
    return Transaction.run(() => {
        const damageInput = wireNumberInputFrp();
        const applyDamage = new StreamSink<Unit>();
        const selectFrp = wireSelectFrp<WoundTarget>("head", new Cell<SelectOptions<WoundTarget>>({
            Head: "head",
            "Left Arm": "larm",
            "Right Arm": "rarm",
            Torso: "torso",
            "Left Leg": "lleg",
            "Right Leg": "rleg",
        }));

        const changes = applyDamage.snapshot5(
            selectFrp.output,
            damageInput.output,
            inputs.size,
            inputs.lightArmor,
            (u, target, damage, size, lightArmor):TargetedWoundChange => {
                const wound = Math.floor((damage - lightArmor) / size);
                return { target, change: wound };
            },
        );

        const head  = wireLimb("head", changes);
        const larm  = wireLimb("larm", changes);
        const rarm  = wireLimb("rarm", changes);
        const torso = wireLimb("torso", changes);
        const lleg  = wireLimb("lleg", changes);
        const rleg  = wireLimb("rleg", changes);

        const maxWound = head.wound.lift6(
            larm.wound, rarm.wound, torso.wound, lleg.wound, rleg.wound,
            Math.max as ((a:Wound, b:Wound, c:Wound, d:Wound, e: Wound, f:Wound) => Wound),
        );

        const dead = head.wound.lift(torso.wound, (h, t) => h === 5 || t === 5);

        return {
            inputs,
            internal: { applyDamage, damageInput, selectFrp, head, larm, rarm, torso, lleg, rleg },
            outputs: { maxWound, dead },
        };
    });
}

export interface WoundTrackerProps {
    readonly frp: WoundTrackerFrp;
}
export interface WoundTrackerState {
    dead: boolean;
}

export class WoundTracker extends React.Component<WoundTrackerProps, WoundTrackerState> {
    constructor(props:WoundTrackerProps) {
        super(props);
        this.state = {
            dead: props.frp.outputs.dead.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.outputs.dead.listen((dead) => {
            this.setState({ dead });
        });
    }

    public shouldComponentUpdate(nextProps: WoundTrackerProps, nextState: WoundTrackerState) {
        return this.state.dead !== nextState.dead;
    }

    public render() {
        const { inputs, internal, outputs } = this.props.frp;

        return <div className="wounds-tracker">
            <h2>Wounds</h2>
            <div className="wounds-container">
                {(outputs.dead.sample()
                    ? (<div className="dead"></div>)
                    : (<div>
                        <div className="wounds">
                            <FRP.div className={internal.head.cssClass}></FRP.div>
                            <FRP.div className={internal.larm.cssClass}></FRP.div>
                            <FRP.div className={internal.rarm.cssClass}></FRP.div>
                            <FRP.div className={internal.torso.cssClass}></FRP.div>
                            <FRP.div className={internal.lleg.cssClass}></FRP.div>
                            <FRP.div className={internal.rleg.cssClass}></FRP.div>
                        </div>
                        <div className="physical-deets">
                            <div>
                                <span>Highest wounds: </span>
                                <FRP.span>{outputs.maxWound}</FRP.span>
                            </div>
                            <div>
                                <span>Light Armor: </span>
                                <FRP.span>{inputs.lightArmor}</FRP.span>
                            </div>
                            <div>
                                <span>Size: </span>
                                <FRP.span>{inputs.size}</FRP.span>
                            </div>
                        </div>
                        <div>
                            <Select frp={internal.selectFrp} />
                            <NumberInput
                                frp={internal.damageInput}
                                placeholder="Damage"
                                className="damage-input"
                            />
                            <button onClick={this.onDamage.bind(this)}>Apply</button>
                        </div>
                    </div>)
                )}
            </div>
        </div>;
    }

    private onDamage(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.applyDamage.send(Unit);
    }
}
