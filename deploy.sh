DIST_DIR="./dist"
CRAFTOS_DIR="$HOME/Library/Application Support/CraftOS-PC/computer/0"
TARGET_DIR_NAME="UwUntuCC"
DEST_PATH="$CRAFTOS_DIR/$TARGET_DIR_NAME"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
mkdir -p "$DIST_DIR/System"
mkdir -p "$DIST_DIR/System/Kernel"
mkdir -p "$DIST_DIR/System/Library"

echo "Building Kernel..."
npm run build --workspace=@uwu/kernel
cp -R packages/kernel/out/* "$DIST_DIR/System/Kernel"

echo "Copying Syslib..."
cp -R packages/syslib/src/* "$DIST_DIR/System/Library"

echo "Deploying to Computer..."
DEST_PATH="$CRAFTOS_DIR/$TARGET_DIR"
rm -rf "$DEST_PATH"
mkdir -p "$DEST_PATH"
cp -R "$DIST_DIR/"* "$DEST_PATH/"

cp "./startup.lua" "$DEST_PATH/startup.lua"
cp "./test.lua" "$DEST_PATH/test.lua"

afplay -v 5.0 /System/Library/Sounds/Purr.aiff &