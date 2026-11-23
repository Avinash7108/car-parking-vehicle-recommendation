@echo off
TITLE SMART PARK AI - Intelligent Car Parking Reservation & Vehicle Detection System
COLOR 0B
echo ===============================================================================
echo                SMART PARK AI - Windows One-Click Launcher
echo ===============================================================================
echo.
echo [1/2] Checking Python environment...
py -3 --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo Python Launcher detected!
    echo.
    echo [2/2] Starting SMART PARK AI Server...
    py -3 run.py
) ELSE (
    python --version >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        echo Python command detected!
        echo.
        echo [2/2] Starting SMART PARK AI Server...
        python run.py
    ) ELSE (
        echo [ERROR] Python 3.10+ was not found on your system PATH!
        echo Please install Python from https://www.python.org/
        pause
    )
)
pause
