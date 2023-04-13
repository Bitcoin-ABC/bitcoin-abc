# CashtabBadge

This component renders a basic CashtabBadge.  
A Payment Badge for us with the Cashtab wallet.

## Example Usage

```jsx
import React from 'react';
import { CashtabBadge } from 'cashtab-components-react';

class MyClass extends React.Component {
    successFn() {
        console.log('Transactions successful');
    }
    failFn(err) {
        console.err('Transaction failed or cancelled');
    }
    render() {
        // EatBCH address for example purposes.
        const paymentAddress =
            'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g';
        const price = 0.1; // Amount of target currency to convert for payment
        const currency = 'CAD'; // Target currency to convert to relative BCH amount

        return (
            <section>
                <CashtabBadge
                    to={paymentAddress}
                    price={price}
                    currency={currency}
                    successFn={this.successFn}
                    failFn={this.failFn}
                    opReturn={['0x6d02', 'Hello CashtabBadge']}
                    tag="Send Now"
                    text="Complete Payment"
                    showQR={true}
                    showBorder={false}
                    repeatable={false}
                    repeatTimeout={4000}
                    watchAddress={true}
                />
            </section>
        );
    }
}
```
