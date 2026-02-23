Self-hosted Lato fonts

This folder contains placeholder files. Replace them with the real Lato .woff2 binaries.

Recommended workflow:
1. Visit https://google-webfonts-helper.herokuapp.com/fonts/lato?subsets=latin
2. Choose the weights you need (300,400,700,900) and download the generated package.
3. Copy the .woff2 files into this folder, keeping the filenames:
   - Lato-Light.woff2 (300)
   - Lato-Regular.woff2 (400)
   - Lato-Bold.woff2 (700)
   - Lato-Black.woff2 (900)
4. Commit the files to your repo (they will be served from /fonts/lato/).

Notes:
- Self-hosting improves resilience and avoids OTS parsing errors caused by network/proxy returning HTML instead of font files.
- Ensure licensing is acceptable for your usage when bundling font files.
