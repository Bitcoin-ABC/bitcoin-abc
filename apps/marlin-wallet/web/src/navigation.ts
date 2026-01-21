// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// ============================================================================
// NAVIGATION MANAGER
// ============================================================================

export enum Screen {
    Main = 'main',
    Send = 'send',
    History = 'history',
    Settings = 'settings',
}

export class Navigation {
    private mainScreen: HTMLElement | null;
    private sendScreen: HTMLElement | null;
    private historyScreen: HTMLElement | null;
    private settingsScreen: HTMLElement | null;
    private currentScreen: Screen | null = null;

    constructor() {
        this.mainScreen = document.getElementById('main-screen');
        this.sendScreen = document.getElementById('send-screen');
        this.historyScreen = document.getElementById('history-screen');
        this.settingsScreen = document.getElementById('settings-screen');
    }

    // Hide all screens
    private hideAllScreens(): void {
        if (this.mainScreen) {
            this.mainScreen.classList.add('hidden');
        }
        if (this.sendScreen) {
            this.sendScreen.classList.add('hidden');
        }
        if (this.historyScreen) {
            this.historyScreen.classList.add('hidden');
        }
        if (this.settingsScreen) {
            this.settingsScreen.classList.add('hidden');
        }
    }

    // Show a specific screen
    showScreen(screen: Screen): void {
        this.hideAllScreens();

        switch (screen) {
            case Screen.Main:
                if (this.mainScreen) {
                    this.mainScreen.classList.remove('hidden');
                }
                break;
            case Screen.Send:
                if (this.sendScreen) {
                    this.sendScreen.classList.remove('hidden');
                }
                break;
            case Screen.History:
                if (this.historyScreen) {
                    this.historyScreen.classList.remove('hidden');
                }
                break;
            case Screen.Settings:
                if (this.settingsScreen) {
                    this.settingsScreen.classList.remove('hidden');
                }
                break;
        }

        this.currentScreen = screen;
    }

    // Get current screen
    getCurrentScreen(): Screen | null {
        return this.currentScreen;
    }
}
