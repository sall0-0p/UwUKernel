print("Hello from pid", os.getPid());
local file = fs.open("/module.lua", "w");
file.writeLine("print('Hello World')");
file.writeLine("return { function hello() print('Hello from function!') end }");
file.close();

local module = require("/module.lua");
module.hello();