import * as React from 'react';
import * as ReactDOM from 'react-dom';

// Define our inner component with a name and a value and a callback 
// when our button is clicked
export interface ListItemProps {
    name: string;
    value: number;
    onClick: (key:string) => void;
}

// And our pure inner component. Renders whatever it is given and
// has no state of it's own (denoted by the empty record in the second
// type variable).
export class ListItem extends React.Component<ListItemProps, {}> {
    render() {
        const { name, value } = this.props;

        return <li>
            <span>{name} </span>
            <button onClick={this.onClick.bind(this)}>
                Clicked {value} times
            </button>
        </li>;
    }
    // When the button is clicked, we call the callback of the parent 
    // with our key.
    onClick() {
        this.props.onClick(this.props.name);
    }
}

// Our UI state is just a list of strings and a counter
// of how many times they have been clicked on.
export interface ListState {
    things: {[name:string]:number};
}

// This is a top level components so no properties
export class List extends React.Component<{}, ListState> {
    constructor(props: {}) {
        super(props);

        // We just initialise our state to something silly
        this.state = {
            things: {
                foo: 0,
                bar: 4,
                baz: 12,
            },
        };
    }
    render() {
        const { } = this.props;
        const { things } = this.state;

        return <ul>
            {Object.keys(things).map((k) => {
                return <ListItem
                    // Any iterable of elements needs to have a key on each element
                    key={k}
                    name={k}
                    onClick={this.onClick.bind(this)}
                    value={things[k]}
                />;
            })}
        </ul>;
    }
    // Our on click at this level increments the counter for that key by one
    onClick(key:string): void {
        this.setState(
            { things: { ...this.state.things, [key]: this.state.things[key] + 1 } },
        );
    }
}

// And our top level. Renders a new instance of the List Component attaching 
// it to the <div id=app></div> on the page.
ReactDOM.render(
    <List />,
    document.getElementById('app'),
);
