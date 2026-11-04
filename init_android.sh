#!/bin/bash
npx cap init "Digital DocuFolio" "com.docufolio.app" --web-dir dist
npx cap add android
npx cap sync android
