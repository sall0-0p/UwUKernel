DIST_DIR="./dist"
CRAFTOS_DIR="$HOME/Library/Application Support/CraftOS-PC/computer/0"
TARGET_DIR_NAME="UwUntuCC"
DEST_PATH="$CRAFTOS_DIR/$TARGET_DIR_NAME"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "Building Kernel..."
npm run build --workspace=@uwu/kernel
cp -R packages/kernel/out/* "$DIST_DIR/"

echo "Copying Syslib..."
cp -R packages/syslib/src/* "$DIST_DIR/"

echo "Deploying to Computer..."
DEST_PATH="$CRAFTOS_DIR/$TARGET_DIR"
rm -rf "$DEST_PATH"
mkdir -p "$DEST_PATH"
cp -R "$DIST_DIR/"* "$DEST_PATH/"

afplay -v 5.0 /System/Library/Sounds/Purr.aiff &