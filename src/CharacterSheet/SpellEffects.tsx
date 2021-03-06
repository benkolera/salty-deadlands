import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Cell, StreamSink, Stream, CellLoop, Transaction, Unit } from 'sodiumjs';
import * as FRP from 'sodium-frp-react';
import { Wound } from './WoundTracker';
import { AptitudeKey, Bonus, bonusApplies, EffectSet } from './Model';
import {
    SpellEffectSection, SpellEffectSectionFrp, wireSpellEffectSectionFrp,
} from "./SpellEffects/SpellEffectSection";
import { DiceSet } from './DiceSet';
import { TraitsFrp } from './index';

/*
This displays the whole right sidebar and outputs all active bonuses.
*/

export interface SpellEffectsInput {
    edges: Cell<EffectSet>;
    hinderances: Cell<EffectSet>;
    blessings: Cell<EffectSet>;
    knacks: Cell<EffectSet>;
    roundProgressed: Stream<Unit>;
    combatEnded: Stream<Unit>;
    traitsFrp: Cell<TraitsFrp>;
}

export interface SpellEffectsInternal {
    edgesFrp: SpellEffectSectionFrp;
    hinderancesFrp: SpellEffectSectionFrp;
    blessingsFrp: SpellEffectSectionFrp;
    knacksFrp: SpellEffectSectionFrp;
}

export interface SpellEffectsOutput {
    bonuses: Cell<Bonus[]>;
}

export interface SpellEffectsFrp {
    input: SpellEffectsInput;
    internal: SpellEffectsInternal;
    output: SpellEffectsOutput;
}

export function wireSpellEffectsFrp(input:SpellEffectsInput): SpellEffectsFrp {
    // Thankfully this is much easier due to static structure
    const edgesFrp = wireSpellEffectSectionFrp({
        effectSet: input.edges,
        roundProgressed: input.roundProgressed,
        combatEnded: input.combatEnded,
        traitsFrp: input.traitsFrp,
    });
    const hinderancesFrp = wireSpellEffectSectionFrp({
        effectSet: input.hinderances,
        roundProgressed: input.roundProgressed,
        combatEnded: input.combatEnded,
        traitsFrp: input.traitsFrp,
    });
    const blessingsFrp = wireSpellEffectSectionFrp({
        effectSet: input.blessings,
        roundProgressed: input.roundProgressed,
        combatEnded: input.combatEnded,
        traitsFrp: input.traitsFrp,
    });
    const knacksFrp = wireSpellEffectSectionFrp({
        effectSet: input.knacks,
        roundProgressed: input.roundProgressed,
        combatEnded: input.combatEnded,
        traitsFrp: input.traitsFrp,
    });

    const passiveBonuses = edgesFrp.output.bonuses.lift4(
        hinderancesFrp.output.bonuses,
        blessingsFrp.output.bonuses,
        knacksFrp.output.bonuses,
        (e, h, b, k) => e.concat(h, b, k),
    );

    return {
        input,
        output: {
            bonuses: passiveBonuses,
        },
        internal: {
            edgesFrp,
            hinderancesFrp,
            blessingsFrp,
            knacksFrp,
        },
    };
}

export interface SpellEffectsProps {
    frp: SpellEffectsFrp;
}

export interface SpellEffectsState {
}

export class SpellEffects extends React.Component<SpellEffectsProps, SpellEffectsState> {
    constructor(props:SpellEffectsProps) {
        super(props);
        this.state = {
        };
    }

    public componentDidMount() {
    }

    public shouldComponentUpdate(
        newProps: SpellEffectsProps,
        newState: SpellEffectsState,
    ): boolean {
        return true;
    }

    public render() {
        const { frp } = this.props;
        const { } = this.state;

        return <div className="spell-effects">
            <SpellEffectSection name="Blessings" frp={frp.internal.blessingsFrp} />
            <SpellEffectSection name="Edges" frp={frp.internal.edgesFrp} />
            <SpellEffectSection name="Hinderances" frp={frp.internal.hinderancesFrp} />
            <SpellEffectSection name="Knacks" frp={frp.internal.knacksFrp} />
        </div>;
    }

}
