@echo off
cd /d f:\CB-szjfp
echo Deploy v041 at %date% %time% > deploy_output_v041.txt
echo. | tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun deploy --force --serviceName szjfp --source f:\CB-szjfp --port 5000 >> deploy_output_v041.txt 2>&1
echo EXIT=%ERRORLEVEL% >> deploy_output_v041.txt
echo DONE at %date% %time% >> deploy_output_v041.txt
