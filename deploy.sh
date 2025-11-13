BUILD_DIR="./out"
CRAFTOS_DIR="$HOME/Library/Application Support/CraftOS-PC/computer/0"
TARGET_DIR_NAME="AlmostOS"
DEST_PATH="$CRAFTOS_DIR/$TARGET_DIR_NAME"

echo "Building project..."
tstl

if [ $? -ne 0 ]; then
  echo "Build failed! Aborting deploy."
  exit 1
fi

echo "Deploying to $DEST_PATH"
rm -rf "$DEST_PATH"
cp -R "$BUILD_DIR" "$DEST_PATH"

echo "Deploy complete."