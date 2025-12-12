ssh -i radio-key.pem ubuntu@98.93.42.61
cd /opt/almanhaj-gateway
git pull origin main
npm install --production
sudo systemctl restart almanhaj-gateway
