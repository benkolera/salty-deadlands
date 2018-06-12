import { CellLoop, Stream, StreamSink, Unit, Cell, Transaction, Operational } from "sodiumjs";

document.body.appendChild(
    new Text("Open the JS console!"),
);

// Make the input from the outside world
const tick = new StreamSink<Unit>();
// For each tick, lets increment a number on each tick
const num: Cell<number> = tick.accum(0, (u, l) => l + 1);
const nums: Stream<number> = Operational.updates(num);

// Create streams of events when our num is divisible by either 3 or 5
const fizz: Stream<string> = nums.filter(x => x % 3 === 0).mapTo("Fizz");
const buzz: Stream<string> = nums.filter(x => x % 5 === 0).mapTo("Buzz");

// The merge combinator forces us to deal with the fact that we have
// a simultaneous event when num is a multiple of 3 and 5.
const fizzBuzz:Stream<string> = fizz.merge(buzz, (f, b) => f + b);

// And merge in the case when fizzBuzz isn't firing (not a multiple of 3 or 5)
const out = fizzBuzz.orElse(nums.map(x => x.toString()));

// Of course, we could have written it in a single cell map as well (but
// this is not preferred as it is less compositional).
const fizzBuzzC: Cell<string> = num.map((n) => {
    if (n % 3 === 0 && n % 5 === 0) {
        return "FizzBuzz";
    } else if (n % 3 === 0) {
        return "Fizz";
    } else if (n % 5 === 0) {
        return "Buzz";
    } else {
        return n.toString();
    }
});

// Observe the values of our streams and cell
nums.listen(n => console.log("Number:", n));
fizz.listen(n => console.log("Fizz:", n));
buzz.listen(n => console.log("Buzz:", n));
fizzBuzz.listen(n => console.log("FizzBuzz:", n));
out.listen(n => console.log("Out Stream", n));
fizzBuzzC.listen(n => console.log("Out Cell", n));

setInterval(() => tick.send(Unit), 1000);
