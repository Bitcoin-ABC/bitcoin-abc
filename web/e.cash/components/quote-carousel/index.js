// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { useState, useEffect } from 'react';
import { QuoteCarouselCtn, QuoteCtn, Quote, DotsCtn, Dot } from './styles';

const quotes = [
    {
        quote: "I think that the internet is going to be one of the major forces for reducing the role of government. The one thing that's missing, but that will soon be developed, is a reliable eCash.",
        author: 'Milton Friedman',
    },
    {
        quote: 'I don’t believe we shall ever have a good money again before we take the thing out of the hands of government, that is, we can’t take them violently out of the hands of government, all we can do is by some sly roundabout way introduce something they can’t stop.',
        author: 'Friedrich Hayek',
    },
    {
        quote: 'With e-currency based on cryptographic proof, without the need to trust a third party middleman, money can be secure and transactions effortless.',
        author: 'Satoshi Nakamoto',
    },
    {
        quote: 'The computer can be used as a tool to liberate and protect people, rather than to control them.',
        author: 'Hal Finney',
    },
];

const delay = 6000;

const QuoteCarousel = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex(prevIndex =>
                prevIndex === quotes.length - 1 ? 0 : prevIndex + 1,
            );
        }, delay);
        return () => clearInterval(interval);
    }, [activeIndex]);

    return (
        <QuoteCarouselCtn>
            <QuoteCtn>
                {quotes.map((quote, index) => (
                    <Quote key={index} active={index === activeIndex}>
                        <p>&ldquo;{quote.quote}&rdquo;</p>
                        <span>-{quote.author}</span>
                    </Quote>
                ))}
            </QuoteCtn>
            <DotsCtn>
                {quotes.map((_, index) => (
                    <Dot
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        active={index === activeIndex}
                    ></Dot>
                ))}
            </DotsCtn>
        </QuoteCarouselCtn>
    );
};

export default QuoteCarousel;
