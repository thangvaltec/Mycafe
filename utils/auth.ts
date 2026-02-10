export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const authUtils = {
    // Check if session is valid
    isValidSession: (): boolean => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const loginTime = localStorage.getItem('loginTimestamp');

        if (!isLoggedIn) return false;

        // Security: Force logout if no timestamp exists (Legacy session or tampering)
        if (!loginTime) {
            authUtils.logout();
            return false;
        }

        const now = new Date().getTime();
        // Check 24 hour expiry
        if (now - parseInt(loginTime) > SESSION_DURATION) {
            authUtils.logout();
            return false;
        }

        return true;
    },

    // Login helper
    login: (role: string) => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('loginTimestamp', new Date().getTime().toString());
    },

    // Logout helper
    logout: () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('loginTimestamp');
        // We do NOT reload window here, let the UI handle it
    }
};
