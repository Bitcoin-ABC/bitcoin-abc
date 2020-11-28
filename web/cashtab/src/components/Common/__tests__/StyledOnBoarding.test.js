import React from 'react';
import renderer from 'react-test-renderer';
import StyledOnBoarding from '../StyledOnBoarding';

test('Render StyledOnBoarding component', () => {
    const component = renderer.create(<StyledOnBoarding />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
