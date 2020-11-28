import React from 'react';
import renderer from 'react-test-renderer';
import StyledPage from '../StyledPage';

test('Render StyledPage component', () => {
    const component = renderer.create(<StyledPage />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
