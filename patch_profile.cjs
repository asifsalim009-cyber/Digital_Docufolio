const fs = require('fs');
let code = fs.readFileSync('components/Profile.tsx', 'utf8');

code = code.replace(
  `onUpdateProfile: (profile: UserProfile) => void;`,
  `onUpdateProfile: (profile: UserProfile) => void;\n  onUseAiCredit?: (amount?: number) => boolean;`
);

code = code.replace(
  `onUpdateProfile
}) => {`,
  `onUpdateProfile,
  onUseAiCredit
}) => {`
);

code = code.replace(
  `const handleDiscoverSocials = async () => {
    setIsDiscovering(true);
    setDiscoveryError(null);`,
  `const handleDiscoverSocials = async () => {
    if (onUseAiCredit && !onUseAiCredit(1)) {
        setDiscoveryError("You have no AI credits remaining. Please upgrade your plan.");
        return;
    }
    setIsDiscovering(true);
    setDiscoveryError(null);`
);

fs.writeFileSync('components/Profile.tsx', code);
