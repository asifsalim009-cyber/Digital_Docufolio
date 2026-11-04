# GitHub + Android Studio workflow

Recommended workflow:

1. AI Studio/source changes are committed to GitHub.
2. Pull the latest project into the local Windows folder.
3. Run `npm ci` and `npm run build` when web source changed.
4. Run `npx cap sync android`.
5. Open the `android` folder in Android Studio.
6. Run/debug or build `app-debug.apk`.

Do not commit:
- `node_modules/`
- `dist/`
- `.env` files containing secrets
- Gemini API keys
- Android release keystores/private signing keys
