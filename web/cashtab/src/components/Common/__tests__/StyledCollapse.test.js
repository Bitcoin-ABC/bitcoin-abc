import React from 'react';
import renderer from 'react-test-renderer';
import { StyledCollapse } from '../StyledCollapse';
import { ThemeProvider } from 'styled-components';
import { theme } from '@assets/styles/theme';

test('Render StyledCollapse component', () => {
    const component = renderer.create(
        <ThemeProvider theme={theme}>
            <StyledCollapse />
        </ThemeProvider>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
});
