-- Helper to create files quickly
function createFile(path, content)
    -- Simple directory creation logic (assumes single level for simplicity)
    local dir = string.match(path, "(.+)/")
    if dir then 
        -- Ignore errors if dir exists (assuming incomplete OS behavior)
        pcall(fs.makeDir, dir) 
    end

    local file = fs.open(path, "w")
    if not file then
        print("CRITICAL: Failed to write test file: " .. path)
        return
    end
    
    -- Split content by newlines to use writeLine as per your API
    for line in string.gmatch(content, "([^\n]+)") do
        file.writeLine(line)
    end
    file.close()
end

print(">>> SETUP: Creating test modules...")

-- 1. Basic Module (Testing .lua appending and basic loading)
createFile("/lib/math_utils.lua", [[
print("   [LOAD] math_utils loaded")
return {
    add = function(a, b) return a + b end
}
]])

-- 2. Relative Import Module (Testing '.' resolution)
createFile("/lib/core.lua", [[
print("   [LOAD] core loaded")
-- Should resolve to /lib/math_utils.lua
local math = require("./math_utils") 
return {
    calculate = function(x) return math.add(x, 10) end
}
]])

-- 3. Circular Dependency Modules (Testing cycle detection)
createFile("/cycle_a.lua", [[
print("   [LOAD] cycle_a starts")
local b = require("cycle_b") -- Should trigger loading B
return "A"
]])

createFile("/cycle_b.lua", [[
print("   [LOAD] cycle_b starts")
local a = require("cycle_a") -- Should detect A is already loading
return "B"
]])

print(">>> TEST 1: Basic Require & Caching")
local m1 = require("lib.math_utils")
local m2 = require("lib.math_utils")

if m1 == m2 then
    print("[PASS] Modules are cached (tables are identical)")
else
    print("[FAIL] Modules are NOT cached")
end

print("\n>>> TEST 2: Relative Imports & Extensions")
-- We require 'lib.core', which internally requires './math_utils'
local core = require("lib.core")
if core.calculate(5) == 15 then
    print("[PASS] Relative import and .lua appending worked")
else
    print("[FAIL] Relative import logic failed")
end

print("\n>>> TEST 3: Circular Dependency")
-- We expect this to fail gracefully with an error message
local status, err = pcall(require, "cycle_a")

if status == false then
    print("[PASS] Detected cycle successfully.")
    print("Error msg: " .. tostring(err));
else
    print("[FAIL] Did not detect circular dependency (Stack overflow might happen next)")
end