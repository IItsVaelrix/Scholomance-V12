@echo off
setlocal EnableDelayedExpansion

echo =======================================
echo   ScholoCandy Plugin Installer Wizard  
echo =======================================
echo.
echo This wizard will compile and install the ScholoCandy VST3 and CLAP plugins.
echo.

:: Check for cargo
cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: Cargo not found in PATH. Make sure Rust is installed.
    exit /b 1
)

echo Where would you like to install the plugins?
echo 1) Current User ( %LOCALAPPDATA%\Programs\Common\VST3 and %LOCALAPPDATA%\Programs\Common\CLAP )
echo 2) System Wide ( C:\Program Files\Common Files\VST3 and C:\Program Files\Common Files\CLAP ) - Requires Admin privileges
set /p INSTALL_CHOICE="Select an option [1 or 2]: "

if "%INSTALL_CHOICE%"=="2" (
    :: Check for Admin rights
    net session >nul 2>&1
    if !errorLevel! neq 0 (
        echo.
        echo ERROR: System-wide installation requires Administrator privileges.
        echo Please right-click this script and select "Run as administrator".
        pause
        exit /b 1
    )
    set "VST3_DIR=%ProgramFiles%\Common Files\VST3"
    set "CLAP_DIR=%ProgramFiles%\Common Files\CLAP"
) else (
    set "VST3_DIR=%LOCALAPPDATA%\Programs\Common\VST3"
    set "CLAP_DIR=%LOCALAPPDATA%\Programs\Common\CLAP"
)

echo.
echo Building the plugins (this might take a moment)...
cd /d "%~dp0"
cargo run -p xtask -- bundle scholo_candy --release
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo Installing plugins...

if not exist "%VST3_DIR%" mkdir "%VST3_DIR%"
if not exist "%CLAP_DIR%" mkdir "%CLAP_DIR%"

:: xcopy copies directories and files, /E includes subdirs, /I assumes dest is a dir, /Y suppresses overwrite prompts
xcopy /E /I /Y "target\bundled\scholo_candy.vst3" "%VST3_DIR%\scholo_candy.vst3"
xcopy /E /I /Y "target\bundled\scholo_candy.clap" "%CLAP_DIR%\scholo_candy.clap"

echo.
echo =======================================
echo         Installation Complete!         
echo =======================================
echo VST3 installed to: %VST3_DIR%\scholo_candy.vst3
echo CLAP installed to: %CLAP_DIR%\scholo_candy.clap
echo.
echo You may need to rescan your plugins in Reaper or your DAW of choice.
pause
