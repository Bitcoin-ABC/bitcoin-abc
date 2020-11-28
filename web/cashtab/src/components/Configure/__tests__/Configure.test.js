import React from 'react';
import renderer from 'react-test-renderer';
import Configure from '../Configure';
let realUseContext;
let useContextMock;
beforeEach(() => {
    realUseContext = React.useContext;
    useContextMock = React.useContext = jest.fn();
});
afterEach(() => {
    React.useContext = realUseContext;
});

test('Configure without a wallet', () => {
    useContextMock.mockReturnValue({ wallet: undefined });
    const component = renderer.create(<Configure />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});

test('Configure with a wallet', () => {
    useContextMock.mockReturnValue({ wallet: { mnemonic: 'test mnemonic' } });
    const component = renderer.create(<Configure />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
