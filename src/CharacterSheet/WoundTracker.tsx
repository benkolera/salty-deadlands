import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { clamp } from 'lodash';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit, StreamLoop } from 'sodiumjs';

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
    readonly selectTargetFrp: SelectFrp<WoundTarget>;
    readonly selectUnitFrp: SelectFrp<DamageUnit>;
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

type DamageUnit = "wounds" | "damage";

export function wireWoundTrackerFrp(inputs: WoundInputs): WoundTrackerFrp {
    return Transaction.run(() => {
        const reset = new StreamLoop<Unit>();
        const damageInput = wireNumberInputFrp({ setInput: reset.mapTo(undefined) });
        const applyDamage = new StreamSink<Unit>();
        const selectTargetFrp = wireSelectFrp<WoundTarget>(
            "head",
            new Cell<SelectOptions<WoundTarget>>({
                Head: "head",
                "Left Arm": "larm",
                "Right Arm": "rarm",
                Torso: "torso",
                "Left Leg": "lleg",
                "Right Leg": "rleg",
            }),
        );
        const selectUnitFrp = wireSelectFrp<DamageUnit>(
            "damage",
            new Cell<SelectOptions<DamageUnit>>({
                Damage: "damage",
                Wounds: "wounds",
            }),
        );

        const changes = applyDamage.snapshot6(
            selectTargetFrp.output,
            selectUnitFrp.output,
            damageInput.output,
            inputs.size,
            inputs.lightArmor,
            (u, target, unit, damage, size, lightArmor):TargetedWoundChange => {
                const wound = (unit === "damage"
                    ? Math.floor(Math.max(0, (damage - lightArmor)) / size)
                    : damage
                );
                return { target, change: wound };
            },
        );
        reset.loop(applyDamage);

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
            internal: {
                applyDamage,
                damageInput,
                selectTargetFrp,
                selectUnitFrp,
                head,
                larm,
                rarm,
                torso,
                lleg,
                rleg,
            },
            outputs: { maxWound, dead },
        };
    });
}

export interface WoundTrackerProps {
    readonly frp: WoundTrackerFrp;
}
export interface WoundTrackerState {
    dead: boolean;
    headCssClass: string;
    larmCssClass: string;
    rarmCssClass: string;
    torsoCssClass: string;
    llegCssClass: string;
    rlegCssClass: string;
    maxWound: number;
    lightArmor: number;
    size: number;
}

export class WoundTracker extends React.Component<WoundTrackerProps, WoundTrackerState> {
    constructor(props:WoundTrackerProps) {
        super(props);
        this.state = {
            dead: props.frp.outputs.dead.sample(),
            headCssClass: props.frp.internal.head.cssClass.sample(),
            larmCssClass: props.frp.internal.larm.cssClass.sample(),
            rarmCssClass: props.frp.internal.rarm.cssClass.sample(),
            torsoCssClass: props.frp.internal.torso.cssClass.sample(),
            llegCssClass: props.frp.internal.lleg.cssClass.sample(),
            rlegCssClass: props.frp.internal.rleg.cssClass.sample(),
            maxWound: props.frp.outputs.maxWound.sample(),
            lightArmor: props.frp.inputs.lightArmor.sample(),
            size: props.frp.inputs.size.sample(),
        };
    }

    public componentDidMount() {
        this.props.frp.outputs.dead.listen((dead) => {
            this.setState({ dead });
        });
        this.props.frp.internal.head.cssClass.listen((headCssClass) => {
            this.setState({ headCssClass });
        });
        this.props.frp.internal.torso.cssClass.listen((torsoCssClass) => {
            this.setState({ torsoCssClass });
        });
        this.props.frp.internal.larm.cssClass.listen((larmCssClass) => {
            this.setState({ larmCssClass });
        });
        this.props.frp.internal.larm.cssClass.listen((rarmCssClass) => {
            this.setState({ rarmCssClass });
        });
        this.props.frp.internal.lleg.cssClass.listen((llegCssClass) => {
            this.setState({ llegCssClass });
        });
        this.props.frp.internal.lleg.cssClass.listen((rlegCssClass) => {
            this.setState({ rlegCssClass });
        });
        this.props.frp.inputs.lightArmor.listen((lightArmor) => {
            this.setState({ lightArmor });
        });
        this.props.frp.inputs.size.listen((size) => {
            this.setState({ size });
        });
        this.props.frp.outputs.maxWound.listen((maxWound) => {
            this.setState({ maxWound });
        });
    }

    public render() {
        const { inputs, internal, outputs } = this.props.frp;
        const {
            headCssClass, larmCssClass, rarmCssClass, torsoCssClass, llegCssClass,
            rlegCssClass, maxWound, lightArmor, size,
        } = this.state;

        return <div className="wounds-tracker">
            <h2>Wounds</h2>
            <div className="wounds-container">
                {(outputs.dead.sample()
                    ? (<div className="dead"></div>)
                    : (<div>
                        <div className="wounds">
                            <div className={headCssClass}></div>
                            <div className={larmCssClass}></div>
                            <div className={rarmCssClass}></div>
                            <div className={torsoCssClass}></div>
                            <div className={llegCssClass}></div>
                            <div className={rlegCssClass}></div>
                        </div>
                    </div>)
                )}
            </div>
            <div className="physical-deets">
                <div>
                    <span>Highest wounds: </span>
                    <span>{maxWound}</span>
                </div>
                <div>
                    <span>Light Armor: </span>
                    <span>{lightArmor}</span>
                </div>
                <div>
                    <span>Size: </span>
                    <span>{size}</span>
                </div>
            </div>
            <div className="damageForm">
                <Select frp={internal.selectTargetFrp} />
                <Select frp={internal.selectUnitFrp} />
                <NumberInput
                    frp={internal.damageInput}
                    placeholder=""
                    className="damage-input"
                />
                <button onClick={this.onDamage.bind(this)}>Apply</button>
            </div>
        </div>;
    }

    private onDamage(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.frp.internal.applyDamage.send(Unit);
    }
}
