export interface authContextType {
    isAuthenticated: boolean | null;
    setIsAuthenticated: (value: boolean) => void;
    checkAuth: () => Promise<void>;
}