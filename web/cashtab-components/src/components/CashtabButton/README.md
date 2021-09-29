# CashtabButton

Renders a basic CashtabButton to integrate with the Cashtab wallet.  
This basic button is ideal for a minimal payment/donation, or if your application wants to control the majority of the payment layout.

## Example Usage

```jsx
import React from 'react';
import { CashtabButton } from 'cashtab-components-react';

class MyClass extends React.PureComponent {
    render() {
        // EatBCH address for example purposes.
        const paymentAddress =
            'bitcoincash:pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g';
        const price = 0.1; // Amount of target currency to convert for payment
        const currency = 'CAD'; // Target currency to convert to relative BCH amount

        return (
            <section>
                <CashtabButton
                    to={paymentAddress}
                    price={price}
                    currency={currency}
                    successFn={tx => console.log(tx)}
                    failFn={err => console.log(err)}
                    text="Donate with BCH"
                    opReturn={['0x6d02', 'Hello CashtabButton']}
                    showBorder={false}
                    showAmount={true}
                    showQR={false}
                    isRepeatable={false}
                    repeatTimeout={4000}
                    watchAddress={false}
                />
            </section>
        );
    }
}
```
