@echo off
setlocal
node --experimental-default-type=module "%~dp0verify-core.mjs"
exit /b %errorlevel%
