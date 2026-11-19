// Build flag for the rewarded campaign. Its own module so the game can read it without loading
// the rewarded campaign (src/hub/campaignRewards/uiFlow.js and the server checks it imports).
export const REWARDED_CAMPAIGN_ENABLED = import.meta.env.VITE_SHOOTER_REWARDED === 'true';
