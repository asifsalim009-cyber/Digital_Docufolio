const fs = require('fs');
let code = fs.readFileSync('components/Profile.tsx', 'utf8');
code = code.replace(
  'onClick={discoverSocialHandles}',
  'onClick={() => discoverSocialHandles(false)}'
);
fs.writeFileSync('components/Profile.tsx', code);
