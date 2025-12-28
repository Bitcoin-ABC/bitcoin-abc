// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const PullToRefreshWrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
` as React.ComponentType<
    React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
>;

const RefreshIndicator = styled.div<{
    pullDistance: number;
    isRefreshing: boolean;
}>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: ${props => Math.min(props.pullDistance, 100)}px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.theme.primaryBackground};
    transform: translateY(${props => Math.min(props.pullDistance - 100, 0)}px);
    transition: ${props =>
        props.isRefreshing ? 'transform 0.2s ease-out' : 'none'};
    z-index: 1000;
    pointer-events: none;
    opacity: ${props => (props.pullDistance > 0 ? 1 : 0)};
` as React.ComponentType<{
    pullDistance: number;
    isRefreshing: boolean;
    children?: React.ReactNode;
}>;

const SpinnerContainer = styled.div<{
    pullDistance: number;
    isRefreshing: boolean;
}>`
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(${props => Math.min(props.pullDistance * 0.5, 50)}px);
    transition: ${props =>
        props.isRefreshing ? 'transform 0.2s ease-out' : 'none'};
` as React.ComponentType<{
    pullDistance: number;
    isRefreshing: boolean;
    children?: React.ReactNode;
}>;

const Spinner = styled.div<{ isRefreshing: boolean; pullDistance: number }>`
    width: 32px;
    height: 32px;
    border: 3px solid ${props => props.theme.border};
    border-top-color: ${props => props.theme.accent};
    border-radius: 50%;
    animation: ${props =>
        props.isRefreshing ? 'spin 0.6s linear infinite' : 'none'};
    transform: ${props =>
        props.isRefreshing
            ? 'rotate(0deg)'
            : `rotate(${props.pullDistance * 2}deg)`};
    transition: ${props => (props.isRefreshing ? 'transform 0.2s' : 'none')};

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
    threshold?: number; // Distance in pixels to trigger refresh
    pullMin?: number; // Minimum distance before preventing default scroll
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    disabled = false,
    threshold = 100,
    pullMin = 180, // Minimum pull distance before preventing default scroll
}) => {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [startY, setStartY] = useState(0);
    const [canPull, setCanPull] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const touchStartYRef = useRef<number>(0);
    const scrollContainerRef = useRef<HTMLElement | null>(null);

    // Check if device is mobile
    const isMobile = () => {
        // Check for touch support
        const hasTouch =
            'ontouchstart' in window || navigator.maxTouchPoints > 0;
        // Check screen width (mobile typically < 768px)
        const isSmallScreen = window.innerWidth < 768;
        // Check user agent for mobile devices
        const isMobileUA =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent,
            );

        return hasTouch && (isSmallScreen || isMobileUA);
    };

    useEffect(() => {
        if (disabled || !isMobile()) return;

        // Find the scrollable parent
        const getScrollContainer = (): HTMLElement | null => {
            if (scrollContainerRef.current) {
                return scrollContainerRef.current;
            }
            // Try to find a scrollable parent
            let element = wrapperRef.current?.parentElement;
            while (element) {
                const style = window.getComputedStyle(element);
                if (
                    style.overflowY === 'auto' ||
                    style.overflowY === 'scroll'
                ) {
                    scrollContainerRef.current = element;
                    return element;
                }
                element = element.parentElement;
            }
            scrollContainerRef.current = document.documentElement;
            return document.documentElement;
        };

        const handleTouchStart = (e: TouchEvent) => {
            const container = getScrollContainer();
            if (!container) return;

            // Only allow pull-to-refresh if we're at the very top (within 5px tolerance)
            const isAtTop = container.scrollTop <= 5;
            if (isAtTop) {
                setCanPull(true);
                touchStartYRef.current = e.touches[0].clientY;
                setStartY(e.touches[0].clientY);
            } else {
                setCanPull(false);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            const container = getScrollContainer();
            if (!container) return;

            // Check if we're still at the top
            const isAtTop = container.scrollTop <= 5;

            if (!canPull || !isAtTop || isRefreshing) {
                // If we were pulling but scrolled away, reset
                if (isPulling) {
                    setIsPulling(false);
                    setPullDistance(0);
                }
                return;
            }

            const currentY = e.touches[0].clientY;
            const distance = currentY - touchStartYRef.current;

            // Only allow downward pull when at the top
            if (distance > 0) {
                // Apply resistance - the further you pull, the more resistance
                const resistance = 0.6;
                const adjustedDistance = Math.min(
                    distance * resistance,
                    threshold * 2,
                );

                // Ionic-style: Only prevent default scrolling after user has committed
                // to the pull gesture by pulling past pullMin threshold
                if (adjustedDistance > pullMin) {
                    e.preventDefault();
                    setIsPulling(true);
                    setPullDistance(adjustedDistance);
                } else {
                    // Below pullMin: allow normal scrolling, but still track distance
                    // for visual feedback (optional - can show subtle indicator)
                    setPullDistance(adjustedDistance);
                    // Don't set isPulling to true yet - let normal scroll happen
                }
            } else {
                // User is scrolling up, not pulling down
                setIsPulling(false);
                setPullDistance(0);
            }
        };

        const handleTouchEnd = async () => {
            if (!isPulling || isRefreshing) {
                setIsPulling(false);
                setPullDistance(0);
                setCanPull(false);
                return;
            }

            if (pullDistance >= threshold) {
                setIsRefreshing(true);
                try {
                    await onRefresh();
                } catch (error) {
                    console.error('Error refreshing:', error);
                } finally {
                    // Keep refreshing state briefly to show completion
                    setTimeout(() => {
                        setIsRefreshing(false);
                        setIsPulling(false);
                        setPullDistance(0);
                        setCanPull(false);
                    }, 300);
                }
            } else {
                // Snap back if not enough pull
                setIsPulling(false);
                setPullDistance(0);
                setCanPull(false);
            }
        };

        // Attach listeners to document to catch all touch events
        document.addEventListener('touchstart', handleTouchStart, {
            passive: true,
        });
        document.addEventListener('touchmove', handleTouchMove, {
            passive: false,
        });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [
        canPull,
        isPulling,
        isRefreshing,
        pullDistance,
        startY,
        threshold,
        pullMin,
        onRefresh,
        disabled,
    ]);

    // Only show indicator after user has committed to pull (past pullMin) or is refreshing
    const showIndicator = (isPulling && pullDistance > pullMin) || isRefreshing;

    return (
        <PullToRefreshWrapper ref={wrapperRef}>
            {showIndicator && (
                <RefreshIndicator
                    pullDistance={pullDistance}
                    isRefreshing={isRefreshing}
                >
                    <SpinnerContainer
                        pullDistance={pullDistance}
                        isRefreshing={isRefreshing}
                    >
                        <Spinner
                            isRefreshing={isRefreshing}
                            pullDistance={pullDistance}
                        />
                    </SpinnerContainer>
                </RefreshIndicator>
            )}
            {children}
        </PullToRefreshWrapper>
    );
};

export default PullToRefresh;
