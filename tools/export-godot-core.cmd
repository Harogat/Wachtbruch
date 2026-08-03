@echo off
setlocal
cd /d "%~dp0.."
node --experimental-default-type=module tools\export-godot-core.mjs %*
endlocal
