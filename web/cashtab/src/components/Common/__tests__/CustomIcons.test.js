import React from 'react';
import renderer from 'react-test-renderer';
import { HammerIcon, PlaneIcon, FireIcon } from '../CustomIcons';

test('Render Custom Icon components', () => {
    const renderedHammerIcon = renderer.create(<HammerIcon />);
    let renderedHammerTree = renderedHammerIcon.toJSON();
    expect(renderedHammerTree).toMatchSnapshot();

    const renderedPlaneIcon = renderer.create(<PlaneIcon />);
    let renderedPlaneIconTree = renderedPlaneIcon.toJSON();
    expect(renderedPlaneIconTree).toMatchSnapshot();

    const renderedFireIcon = renderer.create(<FireIcon />);
    let renderedFileIconTree = renderedFireIcon.toJSON();
    expect(renderedFileIconTree).toMatchSnapshot();
});
