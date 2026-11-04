const fs = require('fs');
let code = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');

const target = `<uses-permission android:name="android.permission.INTERNET" />`;
const replacement = `<uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />`;

code = code.replace(target, replacement);

fs.writeFileSync('android/app/src/main/AndroidManifest.xml', code);
