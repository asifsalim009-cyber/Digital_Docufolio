const fs = require('fs');
let code = fs.readFileSync('components/Profile.tsx', 'utf8');
code = code.replace(
`  useEffect(() => {
    // Auto-discover social handles if the user has an email (loaded via Gmail) 
    // but no social handles have been set yet.
    if (profile.email && !profile.socialHandles?.linkedin && !profile.socialHandles?.twitter && !profile.socialHandles?.github && !profile.socialHandles?.instagram) {
       discoverSocialHandles(true); // forceDiscover = true saves immediately
    }
  }, []);`,
`  const hasAutoDiscovered = React.useRef(false);
  useEffect(() => {
    if (hasAutoDiscovered.current) return;
    
    // Auto-discover social handles if the user has an email (loaded via Gmail) 
    // but no social handles have been set yet.
    if (profile.email && !profile.socialHandles?.linkedin && !profile.socialHandles?.twitter && !profile.socialHandles?.github && !profile.socialHandles?.instagram) {
       hasAutoDiscovered.current = true;
       discoverSocialHandles(true);
    }
  }, [profile.email, profile.socialHandles]);`
);
fs.writeFileSync('components/Profile.tsx', code);
