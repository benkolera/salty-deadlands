import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface ListItemProps {
    name: string;
    value: number;
    onClick: (key:string) => void;
}

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
    onClick() {
        this.props.onClick(this.props.name);
    }
}

export interface ListProps {
}

export interface ListState {
    things: {[name:string]:number};
}

export class List extends React.Component<ListProps, ListState> {
    constructor(props: ListProps) {
        super(props);

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
                    key={k}
                    name={k}
                    onClick={this.onClick.bind(this)}
                    value={things[k]}
                />;
            })}
        </ul>;
    }
    onClick(key:string): void {
        this.setState(
            { things: { ...this.state.things, [key]: this.state.things[key] + 1 } },
        );
    }
}

ReactDOM.render(
    <List />,
    document.getElementById('app'),
);
