const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const pwaMeta = `    <meta name="theme-color" content="#060d1a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <link rel="icon" type="image/png" href="/logo.png" />`;

html = html.replace(
  `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />`,
  `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />\n${pwaMeta}`
);

fs.writeFileSync('index.html', html);
