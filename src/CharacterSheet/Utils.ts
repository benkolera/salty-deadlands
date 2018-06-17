import { Stream } from "sodiumjs";

export function leftmost<A>(... streams: Stream<A>[]): Stream<A> {
    return streams.reduce(
        (acc, s) => acc.merge(s, (a, b) => a),
        new Stream<A>(),
    );
}
