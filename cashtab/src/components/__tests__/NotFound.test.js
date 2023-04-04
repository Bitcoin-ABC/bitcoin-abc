import React from 'react';
import renderer from 'react-test-renderer';
import NotFound from 'components/NotFound';

test('Render NotFound component', () => {
    const component = renderer.create(<NotFound />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
