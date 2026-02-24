import React, { createContext, useContext, useState, useEffect } from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
    const [backTo, setBackTo] = useState(null);

    return (
        <NavigationContext.Provider value={{ backTo, setBackTo }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

/**
 * Hook to set the back route for a page.
 * Sets the route on mount and clears it on unmount.
 * @param {string} route - The route to go back to.
 */
export const useBackTo = (route) => {
    const { setBackTo } = useNavigation();

    useEffect(() => {
        if (route) {
            setBackTo(route);
        }
        return () => {
            setBackTo(null);
        };
    }, [route, setBackTo]);
};
