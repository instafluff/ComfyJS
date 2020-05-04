#!/bin/bash
echo "Updating version"
npm version patch
echo "Building..."
npm run build
echo "Committing..."
git commit -a -m "Latest Build"
echo "Pushing to GitHub"
git push
echo "Publishing comfy.js"
npm publish
# --- NOTE: comfyjs is too similar to comfy.js so NPM returns an error if published ---
# sed -ie 's/comfy.js/comfyjs/g' package.json
# echo "Publishing as comfyjs"
# npm publish
# sed -ie 's/comfyjs/comfy.js/g' package.json
echo "Done!"
