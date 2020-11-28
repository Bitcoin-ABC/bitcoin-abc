import React from 'react';
import renderer from 'react-test-renderer';
import { StyledCollapse } from '../StyledCollapse';

test('Render StyledCollapse component', () => {
    const component = renderer.create(<StyledCollapse />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
