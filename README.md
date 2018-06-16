# Salty Deadlands 

This is an experiment with typescript sodium and react. I did this because 
typescript-sodium doesn't have any UI building helpers yet and I wanted to see
just how much react helped or got in the way when building a UI that was non 
trivial. 

I wanted to figure out whether we should embrace react as a JSX templater and
VDom renderer (in the short or long term) or whether we should just put the 
effort into making efficient DOM building helpers on top of sodium (like what
reflex has done already).

## Running

`yarn watch` from this folder and you'll get a development server up at http://localhost:8080/ 

## What is this thing?

It's a character sheet for the Deadlands Classic Pen and Paper RPG. The main thing to know is
that the attributes in the left column are affected by spells on the right and the wound modifier.

This whole sheet is basically just a big old spreadsheet but prettier and hopefully 
automating a lot more than would be sane in a SS. :)

## Results 

My familarity with Typescript and fantasy land and TS-Sodium is clearly lacking 
in a few combinators that would improve the ergonomics of this app.

  - I've got to figure out how to get traverse.
  - Lifting things from Cell<Record<A>> to a Cell<Record<Cell<A>>> is pretty awkward.
  - We either need to make helpers to bind frp state into react automagically (like what 
    sodium-frp-react is doing) or start work on building DOM out of a cell graph (and 
    having all the machinery for that to be performant).
  - Using react with sodium denies us some use of the higher order sodium tools like
    switchC. At least I tended to make the conditional logic in the render functions
    rather than switching things in and out of the graph.

Overall while I think this stuff would be a lot prettier in a more mature FRP-Dom 
thing like Reflex, I still had a boat load of fun hacking around with this! I hope 
that this being out on the Internet can help a few people out seeing something 
other than the fuel pump examples out there!

At this point I don't think I'd be throwing away my redux app for this kind of 
setup, but I think that it has a lot of promise (especially for apps with a lot
of interrelated dependent data like this one). If you can get away with ghcjs, 
reflex dom may be a better option right now (2018-06-13) but it sure would be 
nice to see an FRP option in a language that your usual frontend dev are 
familary with.

Please feel free to tell me where I'm doing things wrong or could improve! :)

Huge thanks to everyone who has put in the hard work into Sodium and the typescript
impl! :D
