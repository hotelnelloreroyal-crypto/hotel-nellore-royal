// Feature flags configuration
// Controls visibility of Swiggy/Zomato related features across the app

export const ENABLE_AGGREGATORS = import.meta.env.VITE_ENABLE_AGGREGATORS === 'true';

// Helper function to check if aggregators (Swiggy/Zomato) are enabled
export const isAggregatorsEnabled = () => ENABLE_AGGREGATORS;
