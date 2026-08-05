@echo off
chcp 65001 > NUL
title 카카오모먼트 광고 소재 조회 - 로컬 서버
echo ====================================================
echo  카카오모먼트 광고 소재 세팅값 조회 시스템
echo  CORS 보안 제약 없이 http://localhost:8080 으로 실행합니다.
echo ====================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
