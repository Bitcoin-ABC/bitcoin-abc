# Install service
useradd -rs /bin/false xec-verde
chown -R xec-verde:xec-verde /opt/xec-verde
cp xec-verde.service /etc/systemd/system/xec-verde.service
systemctl daemon-reload
systemctl start xec-verde
systemctl enable xec-verde
systemctl status xec-verde
